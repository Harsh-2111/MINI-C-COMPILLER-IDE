from parser import parse
from tac import generate_tac


def tac_for(source):
    parsed = parse(source)
    assert parsed["errors"] == []
    return generate_tac(parsed["ast"])


def test_generates_arithmetic_tac_for_declarations_and_assignment():
    instructions = tac_for("int main() { int x = 2 + 3 * 4; x = -x; return x; }")

    assert instructions == [
        "label main:",
        "t1 = 3 * 4",
        "t2 = 2 + t1",
        "x = t2",
        "t3 = -x",
        "x = t3",
        "return x",
    ]


def test_if_without_else_has_false_branch_and_target_label():
    instructions = tac_for("void f(bool ok) { if (ok) { return; } }")

    assert instructions == [
        "label f:",
        "param ok",
        "if_false ok goto L1",
        "return",
        "label L1:",
    ]
    assert _jump_targets_are_defined(instructions)


def test_if_else_has_distinct_else_and_join_labels():
    instructions = tac_for(
        "int f(int x) { if (x > 0) { return x; } else { return 0; } }"
    )

    assert "t1 = x > 0" in instructions
    assert "if_false t1 goto L1" in instructions
    assert "goto L2" in instructions
    assert "label L1:" in instructions
    assert "label L2:" in instructions
    assert _jump_targets_are_defined(instructions)


def test_while_loop_jumps_back_to_condition_and_exits():
    instructions = tac_for(
        "int count() { int i = 0; while (i < 3) { i = i + 1; } return i; }"
    )

    assert instructions[:3] == ["label count:", "i = 0", "label L1:"]
    assert "if_false t1 goto L2" in instructions
    assert "goto L1" in instructions
    assert "label L2:" in instructions
    assert _jump_targets_are_defined(instructions)


def test_boolean_short_circuit_uses_labels_and_temporary():
    instructions = tac_for(
        "bool check(bool a, bool b) { bool result = a && b || !a; return result; }"
    )

    assert instructions[0:3] == ["label check:", "param a", "param b"]
    assert any(instruction.startswith("if_false a goto L") for instruction in instructions)
    assert any(instruction.startswith("if b goto L") for instruction in instructions)
    assert any(instruction.startswith("goto L") for instruction in instructions)
    assert any(instruction.endswith(" = 1") for instruction in instructions)
    assert any(instruction.endswith(" = 0") for instruction in instructions)
    assert "result = t1" in instructions
    assert _jump_targets_are_defined(instructions)


def test_function_parameters_calls_and_return_values():
    instructions = tac_for(
        "int add(int a, int b) { return a + b; } "
        "int main() { int total = add(2, 3); return total; }"
    )

    assert instructions == [
        "label add:",
        "param a",
        "param b",
        "t1 = a + b",
        "return t1",
        "label main:",
        "param 2",
        "param 3",
        "t2 = call add, 2",
        "total = t2",
        "return total",
    ]


def test_printf_string_literal_is_preserved_in_call_tac():
    instructions = tac_for('int main() { printf("Hello, C!"); return 0; }')

    assert instructions == [
        "label main:",
        'param "Hello, C!"',
        "t1 = call printf, 1",
        "return 0",
    ]


def test_fibonacci_loop_sample_generates_control_flow_and_values():
    instructions = tac_for(
        "int fib(int n) { int a = 0; int b = 1; int i = 0; "
        "while (i < n) { int next = a + b; a = b; b = next; "
        "i = i + 1; } return a; }"
    )

    assert instructions[0:4] == [
        "label fib:",
        "param n",
        "a = 0",
        "b = 1",
    ]
    assert "label L1:" in instructions
    assert any(instruction.endswith(" = a + b") for instruction in instructions)
    assert "goto L1" in instructions
    assert instructions[-1] == "return a"
    assert _jump_targets_are_defined(instructions)


def test_temporary_and_label_sequences_continue_across_functions():
    instructions = tac_for(
        "int first() { return 1 + 2; } int second() { if (true) { return 3; } }"
    )

    assert "t1 = 1 + 2" in instructions
    assert "t2 = 3" not in instructions
    assert "label L1:" in instructions
    assert "label L2:" not in instructions


def _jump_targets_are_defined(instructions):
    defined = {
        instruction.removeprefix("label ").removesuffix(":")
        for instruction in instructions
        if instruction.startswith("label ")
    }
    targets = {
        instruction.rsplit(" ", 1)[-1]
        for instruction in instructions
        if instruction.startswith("goto ")
        or " goto " in instruction
    }
    return targets <= defined
