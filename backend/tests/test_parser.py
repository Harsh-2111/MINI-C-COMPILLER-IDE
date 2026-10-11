from ast_nodes import BinaryExpr, Literal
from parser import parse


def test_parses_function_parameters_and_statements():
    result = parse(
        "int sum(int a, int b) { int total = a + b; "
        "if (total > 10) { return total; } else { return 10; } }"
    )

    assert result["errors"] == []
    function = result["ast"]["children"][0]
    assert function["type"] == "FunctionDecl"
    assert function["label"] == "Function: sum(int a, int b) -> int"
    assert [child["type"] for child in function["children"]] == [
        "Param",
        "Param",
        "Block",
    ]
    block = function["children"][-1]
    assert block["children"][0]["type"] == "VarDecl"
    if_node = block["children"][1]
    assert if_node["type"] == "IfStmt"
    assert [node["type"] for node in if_node["children"]] == [
        "BinaryExpr",
        "Block",
        "Block",
    ]


def test_parses_assignment_loop_return_and_call_expression():
    result = parse(
        "void run() { int x = 0; x = inc(x); "
        "while (x < 3) { print(x); x = x + 1; } return; }"
    )

    assert result["errors"] == []
    statements = result["ast"]["children"][0]["children"][0]["children"]
    assert [node["type"] for node in statements] == [
        "VarDecl",
        "AssignStmt",
        "WhileStmt",
        "ReturnStmt",
    ]
    assert statements[1]["children"][1]["type"] == "CallExpr"
    assert statements[2]["children"][1]["children"][0]["type"] == "ExprStmt"
    assert statements[3]["children"] == []


def test_parses_printf_string_literal():
    result = parse('int main() { printf("Hello, C!"); return 0; }')

    assert result["errors"] == []
    call = result["ast"]["children"][0]["children"][0]["children"][0]["children"][0]
    assert call["type"] == "CallExpr"
    assert call["label"] == "Call: printf"
    assert call["children"][0]["label"] == 'Literal: "Hello, C!"'


def test_operator_precedence_and_left_associativity():
    result = parse("int f() { return 1 + 2 * 3 - 4 - 5; }")
    return_expr = result["ast"]["children"][0]["children"][0]["children"][0][
        "children"
    ][0]

    assert result["errors"] == []
    assert return_expr["label"] == "- (Sub)"
    assert return_expr["children"][0]["label"] == "- (Sub)"
    assert return_expr["children"][0]["children"][0]["label"] == "+ (Add)"
    assert return_expr["children"][0]["children"][0]["children"][1]["label"] == "* (Mul)"


def test_unary_and_boolean_precedence():
    result = parse("bool f() { return !true || false && 1 < 2; }")
    expression = result["ast"]["children"][0]["children"][0]["children"][0][
        "children"
    ][0]

    assert expression["label"] == "||"
    assert expression["children"][0]["label"] == "! (Not)"
    assert expression["children"][1]["label"] == "&&"
    assert expression["children"][1]["children"][1]["label"] == "< (Lt)"


def test_ast_nodes_serialize_exact_required_fields():
    literal = Literal("7", line=2)
    expression = BinaryExpr("+", literal, Literal("8", line=2), line=2)

    assert expression.to_dict() == {
        "type": "BinaryExpr",
        "label": "+ (Add)",
        "line": 2,
        "children": [
            {
                "type": "Literal",
                "label": "Literal: 7",
                "line": 2,
                "children": [],
            },
            {
                "type": "Literal",
                "label": "Literal: 8",
                "line": 2,
                "children": [],
            },
        ],
    }


def test_syntax_error_missing_semicolon_on_line_three():
    source = "int main() {\n    int x = 1;\n    int y = 2\n    return y;\n}"
    result = parse(source)

    assert result["errors"]
    assert result["errors"][0] == {
        "phase": "syntax",
        "line": 3,
        "message": "Expected ';' before 'return'",
    }
    assert result["tokens"]
    assert result["ast"]["type"] == "Program"


def test_parser_returns_empty_program_when_no_function_can_be_parsed():
    result = parse("int broken( {")

    assert result["errors"]
    assert result["ast"] == {
        "type": "Program",
        "label": "Program",
        "line": 1,
        "children": [],
    }
