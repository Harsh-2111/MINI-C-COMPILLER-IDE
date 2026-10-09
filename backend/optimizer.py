"""Iterative TAC optimization with control-flow-aware dead-code removal."""

from __future__ import annotations

import math
import operator
import re
from typing import Any


_NAME = r"[A-Za-z_][A-Za-z0-9_]*|t\d+"
_ASSIGNMENT = re.compile(rf"^\s*({_NAME})\s*=\s*(.*?)\s*$")
_LABEL = re.compile(r"^\s*label\s+([A-Za-z_][A-Za-z0-9_]*|L\d+):\s*$")
_CONDITIONAL = re.compile(
    rf"^\s*(if_false|if)\s+(.+?)\s+goto\s+(L\d+|[A-Za-z_][A-Za-z0-9_]*)\s*$"
)
_GOTO = re.compile(r"^\s*goto\s+(L\d+|[A-Za-z_][A-Za-z0-9_]*)\s*$")
_IDENTIFIER = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b|\bt\d+\b")
_NUMBER = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$")
_BINARY = re.compile(rf"^\s*({_NAME}|[+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(==|!=|<=|>=|&&|\|\||[+\-*/%<>])\s*({_NAME}|[+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$")
_UNARY = re.compile(rf"^\s*(!|-)\s*({_NAME}|[+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$")

_BINARY_OPERATORS: dict[str, Any] = {
    "+": operator.add,
    "-": operator.sub,
    "*": operator.mul,
    "/": operator.truediv,
    "%": operator.mod,
    "<": operator.lt,
    ">": operator.gt,
    "<=": operator.le,
    ">=": operator.ge,
    "==": operator.eq,
    "!=": operator.ne,
}


def optimize_tac(tac: list[str]) -> dict[str, Any]:
    """Optimize TAC and return original, optimized, and explanatory changes."""
    if not isinstance(tac, list) or any(not isinstance(line, str) for line in tac):
        raise TypeError("TAC must be a list of instruction strings")

    original = tac.copy()
    instructions = [_strip_comment(line).strip() for line in tac]
    instructions = [line for line in instructions if line]
    changes: list[dict[str, str]] = []
    known_changes: set[tuple[str, str, str]] = set()

    for _ in range(max(1, len(instructions) * 4)):
        previous = instructions
        instructions = _propagate_and_simplify(instructions, changes, known_changes)
        instructions = _remove_unreachable(instructions, changes, known_changes)
        instructions = _eliminate_dead_assignments(instructions, changes, known_changes)
        if instructions == previous:
            break

    return {
        "original_tac": original,
        "optimized_tac": instructions,
        "optimizations": changes,
        "comments": [
            f"// Before: {item['before']}\n"
            f"// After: {item['after']} // {item['reason']}"
            for item in changes
        ],
    }


def optimize(tac: list[str]) -> dict[str, Any]:
    """Alias for :func:`optimize_tac`."""
    return optimize_tac(tac)


def _propagate_and_simplify(
    instructions: list[str],
    changes: list[dict[str, str]],
    known_changes: set[tuple[str, str, str]],
) -> list[str]:
    optimized: list[str] = []
    known: dict[str, str] = {}
    for line in instructions:
        if _LABEL.match(line):
            known.clear()
            optimized.append(line)
            continue

        match = _ASSIGNMENT.match(line)
        if match:
            destination, expression = match.groups()
            expression = _replace_known(expression, known)
            simplified, reason = _simplify_expression(expression)
            updated = f"{destination} = {simplified}"
            if updated != line:
                _record(changes, known_changes, line, updated, reason)
            line = updated

            known.pop(destination, None)
            if _is_atom(simplified):
                known[destination] = simplified
            optimized.append(line)
            continue

        conditional = _CONDITIONAL.match(line)
        if conditional:
            branch, expression, target = conditional.groups()
            expression = _replace_known(expression, known)
            constant = _constant_truth(expression)
            if constant is not None:
                take_branch = not constant if branch == "if_false" else constant
                if take_branch:
                    updated = f"goto {target}"
                    _record(
                        changes,
                        known_changes,
                        line,
                        updated,
                        "Constant branch resolved",
                    )
                    optimized.append(updated)
                else:
                    _record(
                        changes,
                        known_changes,
                        line,
                        "",
                        "Constant branch never taken",
                    )
                known.clear()
                continue
            updated = f"{branch} {expression} goto {target}"
            if updated != line:
                _record(changes, known_changes, line, updated, "Constant/copy propagated")
            optimized.append(updated)
            known.clear()
            continue

        goto = _GOTO.match(line)
        if goto:
            optimized.append(line)
            known.clear()
            continue

        if line.startswith("return"):
            expression = line[len("return") :].strip()
            if expression:
                updated = f"return {_replace_known(expression, known)}"
                if updated != line:
                    _record(changes, known_changes, line, updated, "Constant/copy propagated")
                line = updated
            optimized.append(line)
            known.clear()
            continue

        if line.startswith("param "):
            value = _replace_known(line[6:], known)
            updated = f"param {value}"
            if updated != line:
                _record(changes, known_changes, line, updated, "Constant/copy propagated")
            optimized.append(updated)
            continue

        optimized.append(line)
    return optimized


def _simplify_expression(expression: str) -> tuple[str, str]:
    expression = expression.strip()
    binary = _BINARY.match(expression)
    if binary:
        left, operation, right = binary.groups()
        left_value, right_value = _parse_constant(left), _parse_constant(right)
        if left_value is not None and right_value is not None:
            value = _calculate(operation, left_value, right_value)
            if value is not None:
                return _format_constant(value), f"Constant folded: {expression}"

        if operation == "+":
            if _is_numeric_zero(right):
                return left, f"Algebraic simplification: {expression}"
            if _is_numeric_zero(left):
                return right, f"Algebraic simplification: {expression}"
        if operation == "-":
            if _is_numeric_zero(right):
                return left, f"Algebraic simplification: {expression}"
        if operation == "*":
            if _is_numeric_one(right):
                return left, f"Algebraic simplification: {expression}"
            if _is_numeric_one(left):
                return right, f"Algebraic simplification: {expression}"
            if _is_numeric_zero(left) or _is_numeric_zero(right):
                return "0", f"Algebraic simplification: {expression}"
        if operation == "/" and _is_numeric_one(right):
            return left, f"Algebraic simplification: {expression}"
        if operation == "%" and _is_numeric_one(right):
            return "0", f"Algebraic simplification: {expression}"

        return expression, ""

    unary = _UNARY.match(expression)
    if unary:
        operation, operand = unary.groups()
        value = _parse_constant(operand)
        if value is not None:
            result: int | float | bool
            if operation == "-":
                result = -value
            else:
                result = not bool(value)
            return _format_constant(result), f"Constant folded: {expression}"
        if operation == "-" and operand.startswith("-"):
            return operand[1:], f"Algebraic simplification: {expression}"
        return expression, ""

    return expression, ""


def _replace_known(expression: str, known: dict[str, str]) -> str:
    if not known:
        return expression
    return _IDENTIFIER.sub(lambda match: known.get(match.group(0), match.group(0)), expression)


def _remove_unreachable(
    instructions: list[str],
    changes: list[dict[str, str]],
    known_changes: set[tuple[str, str, str]],
) -> list[str]:
    if not instructions:
        return instructions

    label_positions = {
        match.group(1): index
        for index, line in enumerate(instructions)
        if (match := _LABEL.match(line))
    }
    function_roots = {
        index
        for index, line in enumerate(instructions)
        if (match := _LABEL.match(line)) and not re.fullmatch(r"L\d+", match.group(1))
    }
    roots = function_roots or {0}
    reachable: set[int] = set()
    pending = list(roots)

    while pending:
        index = pending.pop()
        if index < 0 or index >= len(instructions) or index in reachable:
            continue
        reachable.add(index)
        line = instructions[index]
        next_index = index + 1
        next_is_function = (
            next_index < len(instructions)
            and bool(
                (match := _LABEL.match(instructions[next_index]))
                and not re.fullmatch(r"L\d+", match.group(1))
            )
        )
        conditional = _CONDITIONAL.match(line)
        goto = _GOTO.match(line)
        if conditional:
            target = label_positions.get(conditional.group(3))
            if target is not None:
                pending.append(target)
            if next_index < len(instructions) and not next_is_function:
                pending.append(next_index)
        elif goto:
            target = label_positions.get(goto.group(1))
            if target is not None:
                pending.append(target)
        elif line == "return" or line.startswith("return "):
            continue
        elif next_index < len(instructions) and not next_is_function:
            pending.append(next_index)

    if len(reachable) == len(instructions):
        return instructions
    removed = [line for index, line in enumerate(instructions) if index not in reachable]
    for line in removed:
        _record(
            changes,
            known_changes,
            line,
            "",
            "Unreachable code removed",
        )
    return [line for index, line in enumerate(instructions) if index in reachable]


def _eliminate_dead_assignments(
    instructions: list[str],
    changes: list[dict[str, str]],
    known_changes: set[tuple[str, str, str]],
) -> list[str]:
    if not instructions:
        return instructions

    successors, label_positions = _successors(instructions)
    live_in = [set() for _ in instructions]
    live_out = [set() for _ in instructions]

    changed = True
    while changed:
        changed = False
        for index in range(len(instructions) - 1, -1, -1):
            out = set().union(*(live_in[target] for target in successors[index])) if successors[index] else set()
            uses, definitions = _uses_and_definitions(instructions[index])
            incoming = uses | (out - definitions)
            if out != live_out[index] or incoming != live_in[index]:
                live_out[index] = out
                live_in[index] = incoming
                changed = True

    kept: list[str] = []
    for index, line in enumerate(instructions):
        assignment = _ASSIGNMENT.match(line)
        if assignment:
            destination, expression = assignment.groups()
            if destination not in live_out[index] and not expression.startswith("call "):
                _record(
                    changes,
                    known_changes,
                    line,
                    "",
                    "Dead assignment removed",
                )
                continue
        kept.append(line)
    return kept


def _successors(instructions: list[str]) -> tuple[list[set[int]], dict[str, int]]:
    labels = {
        match.group(1): index
        for index, line in enumerate(instructions)
        if (match := _LABEL.match(line))
    }
    result: list[set[int]] = []
    for index, line in enumerate(instructions):
        next_index = index + 1
        next_is_function = (
            next_index < len(instructions)
            and bool(
                (match := _LABEL.match(instructions[next_index]))
                and not re.fullmatch(r"L\d+", match.group(1))
            )
        )
        conditional = _CONDITIONAL.match(line)
        goto = _GOTO.match(line)
        if conditional:
            successors = {labels[conditional.group(3)]} if conditional.group(3) in labels else set()
            if next_index < len(instructions) and not next_is_function:
                successors.add(next_index)
        elif goto:
            successors = {labels[goto.group(1)]} if goto.group(1) in labels else set()
        elif line == "return" or line.startswith("return "):
            successors = set()
        elif next_index < len(instructions) and not next_is_function:
            successors = {next_index}
        else:
            successors = set()
        result.append(successors)
    return result, labels


def _uses_and_definitions(line: str) -> tuple[set[str], set[str]]:
    assignment = _ASSIGNMENT.match(line)
    if assignment:
        destination, expression = assignment.groups()
        if expression.startswith("call "):
            return _identifiers(expression.split(",", 1)[1] if "," in expression else ""), {destination}
        return _identifiers(expression), {destination}
    if line.startswith("param "):
        return _identifiers(line[6:]), set()
    if line.startswith("return "):
        return _identifiers(line[7:]), set()
    conditional = _CONDITIONAL.match(line)
    if conditional:
        return _identifiers(conditional.group(2)), set()
    return set(), set()


def _identifiers(expression: str) -> set[str]:
    return {
        name
        for name in _IDENTIFIER.findall(expression)
        if not name.startswith("L") and name not in {"true", "false"}
    }


def _constant_truth(expression: str) -> bool | None:
    expression = expression.strip()
    value = _parse_constant(expression)
    if value is not None:
        return bool(value)
    binary = _BINARY.match(expression)
    if not binary:
        return None
    left, operation, right = binary.groups()
    left_value, right_value = _parse_constant(left), _parse_constant(right)
    if left_value is None or right_value is None:
        return None
    if operation in {"&&", "||"}:
        result = bool(left_value) and bool(right_value) if operation == "&&" else bool(left_value) or bool(right_value)
        return result
    result = _calculate(operation, left_value, right_value)
    return bool(result) if isinstance(result, (bool, int, float)) else None


def _parse_constant(value: str) -> int | float | bool | None:
    value = value.strip()
    if value == "true":
        return True
    if value == "false":
        return False
    if not _NUMBER.fullmatch(value):
        return None
    try:
        number = float(value) if "." in value else int(value)
        return number
    except ValueError:
        return None


def _calculate(
    operation: str, left: int | float | bool, right: int | float | bool
) -> int | float | bool | None:
    if operation == "&&":
        return bool(left) and bool(right)
    if operation == "||":
        return bool(left) or bool(right)
    function = _BINARY_OPERATORS.get(operation)
    if function is None:
        return None
    try:
        result = function(left, right)
    except (ArithmeticError, TypeError, ValueError):
        return None
    if isinstance(result, float) and not math.isfinite(result):
        return None
    return result


def _format_constant(value: int | float | bool) -> str:
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, float):
        return repr(value)
    return str(value)


def _is_atom(expression: str) -> bool:
    return bool(
        _parse_constant(expression) is not None
        or re.fullmatch(_NAME, expression)
    )


def _is_numeric_zero(expression: str) -> bool:
    value = _parse_constant(expression)
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value == 0


def _is_numeric_one(expression: str) -> bool:
    value = _parse_constant(expression)
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value == 1


def _strip_comment(line: str) -> str:
    return line.split("//", 1)[0].rstrip()


def _record(
    changes: list[dict[str, str]],
    known_changes: set[tuple[str, str, str]],
    before: str,
    after: str,
    reason: str,
) -> None:
    key = (before, after, reason)
    if key in known_changes:
        return
    known_changes.add(key)
    changes.append({"before": before, "after": after, "reason": reason})
