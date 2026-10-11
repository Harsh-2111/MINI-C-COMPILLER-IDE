"""Generate reproducible compiler-error and optimization training datasets."""

from __future__ import annotations

import csv
import random
import re
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from ..lexer import tokenize
    from ..optimizer import optimize_tac
    from ..parser import parse
    from ..semantic import analyze
    from ..tac import generate_tac
except ImportError:
    from lexer import tokenize
    from optimizer import optimize_tac
    from parser import parse
    from semantic import analyze
    from tac import generate_tac

DATA_DIR = Path(__file__).with_name("data")
ERROR_SAMPLE_COUNT = 2_800
OPTIMIZATION_SAMPLE_COUNT = 1_600
RANDOM_SEED = 42
FEATURE_COLUMNS = [
    "tac_length",
    "constant_ops_count",
    "unused_assignments_count",
    "branch_constants",
    "loop_count",
    "function_call_count",
    "nesting_depth",
]
_ASSIGNMENT = re.compile(r"^\s*([A-Za-z_]\w*|t\d+)\s*=\s*(.*)$")
_NUMBER = r"(?:\d+(?:\.\d*)?|\.\d+)"
_BINARY_CONSTANT = re.compile(
    rf"(?:\b{_NUMBER}\b\s*[+\-*/%<>]=?\s*[A-Za-z_]\w*|"
    rf"[A-Za-z_]\w*\s*[+\-*/%<>]=?\s*\b{_NUMBER}\b|"
    rf"\b{_NUMBER}\b\s*[+\-*/%<>]\s*\b{_NUMBER}\b)"
)
_CONSTANT_BRANCH = re.compile(
    rf"\bif(?:_false)?\s+{_NUMBER}\s*(?:==|!=|<=|>=|<|>)\s*{_NUMBER}\b"
)


def _run_pipeline(code: str) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    parsed = parse(code)
    errors = parsed["errors"]
    if not errors:
        semantic_result = analyze(parsed["ast"])
        errors = semantic_result["errors"]
    if errors:
        return errors, [], []
    symbols = semantic_result["symbol_table"]
    tac = generate_tac(parsed["ast"], symbols)
    optimized_tac = optimize_tac(tac)["optimized_tac"]
    return [], tac, optimized_tac


def _mutated_error_program(category: str, index: int, rng: random.Random) -> str:
    name = f"value_{index}"
    number = rng.randint(2, 99)
    source = (
        f"int main() {{\n"
        f"    int {name} = {number};\n"
        f"    return {name};\n"
        f"}}\n"
    )
    if category == "missing_semicolon":
        return source.replace(f"= {number};", f"= {number}", 1)
    if category == "undeclared_identifier":
        return source.replace(f"= {number};", f"= missing_{index};", 1)
    if category == "type_mismatch":
        decimal = f"{number}.{rng.randint(1, 99)}"
        return source.replace(f"= {number};", f"= {decimal};", 1)
    if category == "illegal_character":
        expression = f"{rng.randint(2, 99)} @ {rng.randint(2, 99)}"
        return source.replace(f"= {number};", f"= {expression};", 1)
    if category == "missing_brace_or_paren":
        if index % 2:
            condition = rng.randint(2, 99)
            return (
                f"int main() {{\n"
                f"    int {name} = {number};\n"
                f"    if ({condition} == {condition} {{\n"
                f"        {name} = {name} + 1;\n"
                f"    }}\n"
                f"    return {name};\n"
                f"}}\n"
            )
        return source[:-2]
    if category == "return_type_mismatch":
        return source.replace(f"return {name};", "return true;", 1)
    if category == "other":
        return source.replace(
            f"    return {name};",
            f"    int {name} = {number + 1};\n    return {name};",
            1,
        )
    raise ValueError(f"Unsupported error category: {category}")


def _diagnostic_category(error: dict[str, Any]) -> str:
    phase = error["phase"]
    message = error["message"]
    if phase == "lexical":
        return "illegal_character"
    if phase == "syntax":
        if "Expected ';' before 'return'" in message:
            return "missing_semicolon"
        return "missing_brace_or_paren"
    if "Undeclared identifier" in message:
        return "undeclared_identifier"
    if "Type mismatch" in message and "returns" in message:
        return "return_type_mismatch"
    if "Type mismatch" in message:
        return "type_mismatch"
    return "other"


def _optimization_program(index: int, rng: random.Random) -> str:
    kind = index % 6
    number = rng.randint(2, 50)
    other = rng.randint(2, 20)
    if kind == 0:
        return f"int main() {{ return {number}; }}\n"
    if kind == 1:
        return (
            f"int main() {{\n"
            f"    int value_{index} = {number};\n"
            f"    value_{index} = value_{index} + 0;\n"
            f"    return value_{index};\n"
            f"}}\n"
        )
    if kind == 2:
        return (
            f"int main() {{\n"
            f"    int unused_{index} = {number};\n"
            f"    return {other};\n"
            f"}}\n"
        )
    if kind == 3:
        return (
            f"int main() {{\n"
            f"    int value_{index} = {number};\n"
            f"    if (0 == 1) {{ value_{index} = value_{index} + {other}; }}\n"
            f"    return value_{index};\n"
            f"}}\n"
        )
    if kind == 4:
        return (
            f"int main() {{\n"
            f"    int value_{index} = {number};\n"
            f"    while (0 == 1) {{ value_{index} = value_{index} + 1; }}\n"
            f"    return value_{index};\n"
            f"}}\n"
        )
    return (
        f"int helper_{index}(int input_{index}) {{ return input_{index}; }}\n"
        f"int main() {{ return helper_{index}({number}); }}\n"
    )


def _optimization_features(
    code: str, tac: list[str], optimized_tac: list[str]
) -> dict[str, int]:
    unused_assignments = 0
    for position, instruction in enumerate(tac):
        assignment = _ASSIGNMENT.match(instruction)
        if assignment is None:
            continue
        destination = assignment.group(1)
        later_text = "\n".join(tac[position + 1 :])
        if not re.search(rf"\b{re.escape(destination)}\b", later_text):
            unused_assignments += 1

    depth = 0
    maximum_depth = 0
    for character in code:
        if character == "{":
            depth += 1
            maximum_depth = max(maximum_depth, depth)
        elif character == "}":
            depth = max(0, depth - 1)

    return {
        "tac_length": len(tac),
        "constant_ops_count": sum(
            bool(_BINARY_CONSTANT.search(instruction)) for instruction in tac
        ),
        "unused_assignments_count": unused_assignments,
        "branch_constants": sum(
            bool(_CONSTANT_BRANCH.search(instruction)) for instruction in tac
        ),
        "loop_count": len(re.findall(r"\bwhile\s*\(", code)),
        "function_call_count": sum(instruction.startswith("call ") for instruction in tac),
        "nesting_depth": maximum_depth,
    }


def generate_datasets(
    output_dir: Path | str = DATA_DIR,
    seed: int = RANDOM_SEED,
    error_sample_count: int = ERROR_SAMPLE_COUNT,
    optimization_sample_count: int = OPTIMIZATION_SAMPLE_COUNT,
) -> tuple[Path, Path]:
    """Write balanced error examples and compiler-derived optimization examples."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    categories = (
        "missing_semicolon",
        "undeclared_identifier",
        "type_mismatch",
        "illegal_character",
        "missing_brace_or_paren",
        "return_type_mismatch",
        "other",
    )
    error_rows = []
    base_count, remainder = divmod(error_sample_count, len(categories))
    sample_index = 0
    for category_index, category in enumerate(categories):
        count = base_count + (category_index < remainder)
        for _ in range(count):
            code = _mutated_error_program(category, sample_index, rng)
            errors, _, _ = _run_pipeline(code)
            if not errors:
                raise RuntimeError(
                    f"Compiler pipeline accepted generated {category} sample {sample_index}"
                )
            diagnostic = errors[0]
            actual_category = _diagnostic_category(diagnostic)
            if actual_category != category:
                raise RuntimeError(
                    f"Generated {category} sample {sample_index} was classified as "
                    f"{actual_category}: {diagnostic}"
                )
            error_rows.append(
                {
                    "text": f"{diagnostic['phase']} {diagnostic['message']}",
                    "phase": diagnostic["phase"],
                    "message": diagnostic["message"],
                    "category": category,
                    "code": code,
                }
            )
            sample_index += 1

    optimization_rows = []
    for index in range(optimization_sample_count):
        code = _optimization_program(index, rng)
        errors, tac, optimized_tac = _run_pipeline(code)
        if errors:
            raise RuntimeError(
                f"Compiler rejected generated optimization sample {index}: {errors}"
            )
        reduction = len(tac) - len(optimized_tac)
        if reduction < 0:
            raise RuntimeError("Optimizer increased TAC length for generated sample")
        features = _optimization_features(code, tac, optimized_tac)
        optimization_rows.append(
            {
                **features,
                "reduction": reduction,
                "has_reduction": int(reduction > 0),
                "code": code,
                "tac": json_compact(tac),
                "optimized_tac": json_compact(optimized_tac),
            }
        )

    errors_file = output_path / "errors.csv"
    optimization_file = output_path / "optimization.csv"
    pd.DataFrame(error_rows).to_csv(errors_file, index=False, quoting=csv.QUOTE_MINIMAL)
    pd.DataFrame(optimization_rows).to_csv(
        optimization_file,
        index=False,
        quoting=csv.QUOTE_MINIMAL,
    )
    return errors_file, optimization_file


def json_compact(value: list[str]) -> str:
    import json

    return json.dumps(value, separators=(",", ":"))


def main() -> None:
    errors_file, optimization_file = generate_datasets()
    print(f"Generated {ERROR_SAMPLE_COUNT} compiler errors: {errors_file}")
    print(f"Generated {OPTIMIZATION_SAMPLE_COUNT} optimization samples: {optimization_file}")


if __name__ == "__main__":
    main()
