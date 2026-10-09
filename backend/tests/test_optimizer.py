from optimizer import optimize_tac


def optimized(lines):
    return optimize_tac(lines)


def test_constant_folding_propagation_and_explanatory_comments():
    result = optimized(
        [
            "label main:",
            "t1 = 10 * 5",
            "x = t1",
            "y = x + 2",
            "return y",
        ]
    )

    assert result["optimized_tac"] == ["label main:", "return 52"]
    assert any(change["reason"].startswith("Constant folded") for change in result["optimizations"])
    assert any("// Before:" in comment and "// After:" in comment for comment in result["comments"])


def test_algebraic_simplification_and_copy_propagation():
    result = optimized(
        [
            "label main:",
            "x = input",
            "y = x",
            "z = y + 0",
            "a = z * 1",
            "b = a * 0",
            "return b",
        ]
    )

    assert result["optimized_tac"] == ["label main:", "return 0"]
    reasons = {change["reason"] for change in result["optimizations"]}
    assert "Constant/copy propagated" in reasons
    assert any("Algebraic simplification" in reason for reason in reasons)


def test_dead_temporaries_and_dead_local_assignments_removed():
    result = optimized(
        [
            "label main:",
            "t1 = 2 + 3",
            "unused = t1",
            "used = 9",
            "return used",
        ]
    )

    assert result["optimized_tac"] == ["label main:", "return 9"]
    assert any(change["reason"] == "Dead assignment removed" for change in result["optimizations"])


def test_constant_comparison_removes_unreachable_branch():
    result = optimized(
        [
            "label main:",
            "if_false 1 == 1 goto L1",
            "x = 7",
            "goto L2",
            "label L1:",
            "x = 9",
            "label L2:",
            "return x",
        ]
    )

    assert "x = 9" not in result["optimized_tac"]
    assert "label L1:" not in result["optimized_tac"]
    assert "x = 7" in result["optimized_tac"]
    assert result["optimized_tac"][-1] == "return x"
    assert any("Unreachable code removed" == change["reason"] for change in result["optimizations"])


def test_loop_control_flow_and_mutable_values_are_preserved():
    source = [
        "label main:",
        "i = 0",
        "label L1:",
        "t1 = i < 5",
        "if_false t1 goto L2",
        "i = i + 1",
        "goto L1",
        "label L2:",
        "return i",
    ]
    result = optimized(source)

    assert "label L1:" in result["optimized_tac"]
    assert "goto L1" in result["optimized_tac"]
    assert "if_false t1 goto L2" in result["optimized_tac"]
    assert result["optimized_tac"][-1] == "return i"


def test_constant_if_branch_simplifies_and_keeps_function_roots():
    result = optimized(
        [
            "label first:",
            "if_false 1 goto L1",
            "return 1",
            "label L1:",
            "return 2",
            "label second:",
            "return 3",
        ]
    )

    assert result["optimized_tac"] == [
        "label first:",
        "return 1",
        "label second:",
        "return 3",
    ]


def test_calls_and_parameters_are_not_removed_as_dead_side_effects():
    result = optimized(
        [
            "label main:",
            "param 3",
            "t1 = call effect, 1",
            "return",
        ]
    )

    assert result["optimized_tac"] == [
        "label main:",
        "param 3",
        "t1 = call effect, 1",
        "return",
    ]


def test_comparison_and_boolean_constant_folding():
    result = optimized(
        [
            "label main:",
            "t1 = 4 <= 4",
            "t2 = 0 || 1",
            "if_false t1 && t2 goto L1",
            "return 8",
            "label L1:",
            "return 9",
        ]
    )

    assert result["optimized_tac"] == ["label main:", "return 8"]


def test_no_changes_returns_stable_tac_and_empty_log():
    lines = ["label main:", "return 1"]
    result = optimized(lines)

    assert result["optimized_tac"] == lines
    assert result["optimizations"] == []
    assert result["comments"] == []
