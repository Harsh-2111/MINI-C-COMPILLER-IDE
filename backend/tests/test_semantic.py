from parser import parse
from semantic import analyze


def analyze_source(source):
    parsed = parse(source)
    assert parsed["errors"] == []
    return analyze(parsed["ast"])


def test_symbol_table_scopes_and_sequential_byte_offsets():
    result = analyze_source(
        "int add(int a, float b) { bool ok = true; int sum = a + 2; "
        "{ float temp = b; } return sum; }"
    )

    assert result["errors"] == []
    assert result["symbol_table"] == [
        {
            "name": "add",
            "type": "int(int, float)",
            "scope": "global",
            "offset": 0,
            "line": 1,
        },
        {
            "name": "a",
            "type": "int",
            "scope": "add()",
            "offset": 0,
            "line": 1,
        },
        {
            "name": "b",
            "type": "float",
            "scope": "add()",
            "offset": 4,
            "line": 1,
        },
        {
            "name": "ok",
            "type": "bool",
            "scope": "add()",
            "offset": 12,
            "line": 1,
        },
        {
            "name": "sum",
            "type": "int",
            "scope": "add()",
            "offset": 16,
            "line": 1,
        },
        {
            "name": "temp",
            "type": "float",
            "scope": "add()#block1",
            "offset": 20,
            "line": 1,
        },
    ]


def test_mixed_numeric_arithmetic_widens_and_float_to_int_fails():
    result = analyze_source(
        "int f() { float x = 1 + 2.5; int y = 2.5; return 1; }"
    )

    assert result["errors"] == [
        {
            "phase": "semantic",
            "line": 1,
            "message": "Type mismatch: cannot assign 'float' to 'int' variable 'y'",
        }
    ]


def test_undeclared_identifier_and_undefined_function_are_reported():
    result = analyze_source("int main() { int y = missing + 1; foo(); return 0; }")

    assert [error["message"] for error in result["errors"]] == [
        "Undeclared identifier 'missing'",
        "Call to undefined function 'foo'",
    ]
    assert all(error["phase"] == "semantic" for error in result["errors"])


def test_scope_shadowing_allowed_but_same_scope_redeclaration_rejected():
    result = analyze_source(
        "int main() { int x = 1; { float x = 2.0; } int x = 3; return x; }"
    )

    assert [entry["name"] for entry in result["symbol_table"]] == [
        "main",
        "x",
        "x",
    ]
    assert result["errors"] == [
        {
            "phase": "semantic",
            "line": 1,
            "message": "Redeclaration of 'x' in the same scope",
        }
    ]


def test_bool_operators_and_conditions_are_checked():
    result = analyze_source(
        "int main() { int x = 1; if (x) { x = true + 1; } "
        "while (1 && true) { x = 2; } return 0; }"
    )

    messages = [error["message"] for error in result["errors"]]
    assert "Condition expression must evaluate to 'bool'" in messages
    assert "Invalid operand types for operator '+'" in messages
    assert "Invalid operand types for operator '&&'" in messages


def test_function_call_argument_count_and_type_checks():
    result = analyze_source(
        "int add(int x, bool ok) { return x; } "
        "int main() { add(1, 2, 3); add(true, false); return 0; }"
    )

    messages = [error["message"] for error in result["errors"]]
    assert "Function 'add' expects 2 arguments but got 3" in messages
    assert (
        "Type mismatch: argument 1 of function 'add' expects 'int' but got 'bool'"
        in messages
    )


def test_return_type_and_missing_return_are_reported():
    result = analyze_source(
        "int wrong() { return true; } float missing() { int x = 1; } "
        "void okay() { return; }"
    )

    messages = [error["message"] for error in result["errors"]]
    assert (
        "Type mismatch: function 'wrong' returns 'int' but got 'bool'" in messages
    )
    assert "Missing return in non-void function 'missing'" in messages
    assert not any("Missing return in non-void function 'okay'" in msg for msg in messages)


def test_missing_main_warning_only_when_program_has_no_functions():
    empty_result = analyze(parse(""))
    nonempty_result = analyze_source("void helper() { return; }")

    assert empty_result["errors"] == [
        {
            "phase": "semantic",
            "line": 1,
            "message": "Program must define 'int main()'",
        }
    ]
    assert nonempty_result["errors"] == []
