"""FastAPI service exposing the OptiLexis AI compiler pipeline."""

from __future__ import annotations

import os
import re
from collections import Counter
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

try:
    from . import ai
    from .lexer import tokenize
    from .ml.predict import MLAdvisor
    from .optimizer import optimize_tac
    from .parser import parse
    from .semantic import analyze
    from .tac import generate_tac
except ImportError:
    import ai
    from lexer import tokenize
    from ml.predict import MLAdvisor
    from optimizer import optimize_tac
    from parser import parse
    from semantic import analyze
    from tac import generate_tac

app = FastAPI(title="OptiLexis AI Compiler API", version="1.0.0")
ml_advisor = MLAdvisor()
configured_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *configured_origins,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str


class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    error: ai.CompileError


class AdviseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    tac: list[str] = Field(default_factory=list)
    optimized_tac: list[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    type: str
    value: str
    line: int


class ASTResponse(BaseModel):
    type: str
    label: str
    line: int
    children: list["ASTResponse"] = Field(default_factory=list)


class SymbolResponse(BaseModel):
    name: str
    type: str
    scope: str
    offset: int
    line: int


class ErrorResponse(BaseModel):
    phase: Literal["lexical", "syntax", "semantic"]
    line: int
    message: str


class CompileResponse(BaseModel):
    tokens: list[TokenResponse]
    ast: ASTResponse
    symbols: list[SymbolResponse]
    tac: list[str]
    optimized_tac: list[str]
    errors: list[ErrorResponse]


ASTResponse.model_rebuild()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ml/status")
async def ml_status() -> dict:
    return {
        "loaded": ml_advisor.loaded,
        "model_types": ml_advisor.model_types,
        "dataset_sizes": ml_advisor.dataset_sizes,
        "metrics": ml_advisor.metrics,
        "load_error": ml_advisor.load_error,
    }


@app.post("/compile", response_model=CompileResponse)
async def compile_source(request: CompileRequest) -> CompileResponse:
    return _compile_source(request.code)


def _compile_source(code: str) -> CompileResponse:
    tokens: list[dict] = []
    try:
        tokens, _ = tokenize(code)
        parsed = parse(code)
        errors = parsed["errors"]
        printf_diagnostics = _unquoted_printf_diagnostics(code)
        if printf_diagnostics:
            printf_lines = {error["line"] for error in printf_diagnostics}
            errors = [
                *printf_diagnostics,
                *(
                    error
                    for error in errors
                    if error["line"] not in printf_lines
                ),
            ]
        ast = parsed["ast"]
        symbols: list[dict] = []
        tac: list[str] = []
        optimized_tac: list[str] = []

        if not errors:
            semantic_result = analyze(ast)
            symbols = semantic_result["symbol_table"]
            errors.extend(semantic_result["errors"])
            if not errors:
                tac = generate_tac(ast, symbols)
                optimized_tac = optimize_tac(tac)["optimized_tac"]

        return CompileResponse(
            tokens=tokens,
            ast=ast,
            symbols=symbols,
            tac=tac,
            optimized_tac=optimized_tac,
            errors=errors,
        )
    except Exception as exception:
        return CompileResponse(
            tokens=tokens,
            ast={"type": "Program", "label": "Program", "line": 1, "children": []},
            symbols=[],
            tac=[],
            optimized_tac=[],
            errors=[
                {
                    "phase": "semantic",
                    "line": 1,
                    "message": f"Compilation error: {exception}",
                }
            ],
        )


@app.post("/explain")
async def explain(request: ExplainRequest) -> dict:
    current_code = request.code
    explanations: list[str] = []
    fixes: list[str] = []
    gemini_used = False
    accepted_fix_count = 0
    seen_code = {current_code}

    for _ in range(8):
        current_errors = _compile_source(current_code).errors
        if not current_errors:
            break

        current_error = (
            next(
                (
                    error
                    for error in current_errors
                    if (
                        error.phase,
                        error.line,
                        error.message,
                    )
                    == (
                        request.error.phase,
                        request.error.line,
                        request.error.message,
                    )
                ),
                current_errors[0],
            )
            if accepted_fix_count == 0
            else current_errors[0]
        )
        suggested, suggestion_used_gemini = await ai.explain_error_with_source(
            current_code, ai.CompileError.model_validate(current_error.model_dump())
        )
        candidate_code = suggested.fixed_code
        candidate_errors = (
            _compile_source(candidate_code).errors
            if candidate_code != current_code and candidate_code not in seen_code
            else current_errors
        )

        if not _fix_improves_diagnostics(current_errors, candidate_errors, current_error):
            suggested = ai._fallback_explanation(current_code, current_error)
            candidate_code = suggested.fixed_code
            candidate_errors = (
                _compile_source(candidate_code).errors
                if candidate_code != current_code and candidate_code not in seen_code
                else current_errors
            )
            suggestion_used_gemini = False

        if not _fix_improves_diagnostics(current_errors, candidate_errors, current_error):
            if accepted_fix_count == 0:
                explanations.append(suggested.explanation)
                fixes.append(
                    "No safe change could be verified against the compiler. "
                    "Correct this diagnostic and compile again."
                )
            break

        current_code = candidate_code
        seen_code.add(current_code)
        accepted_fix_count += 1
        gemini_used = gemini_used or suggestion_used_gemini
        explanations.append(suggested.explanation)
        fixes.append(suggested.fix)

    remaining_errors = _compile_source(current_code).errors
    if accepted_fix_count:
        explanation = " ".join(explanations)
        if remaining_errors:
            explanation += (
                f" The verified changes resolve {accepted_fix_count} diagnostic(s); "
                f"{len(remaining_errors)} remain."
            )
        else:
            explanation += " The compiler verifies that all diagnostics are resolved."
        response = ai.ExplanationResponse(
            explanation=explanation,
            fix=" ".join(fixes),
            fixed_code=current_code,
        )
    else:
        response = ai.ExplanationResponse(
            explanation=" ".join(explanations)
            or "No compiler diagnostics were found for this source.",
            fix=fixes[0]
            if fixes
            else "No source change is needed.",
            fixed_code=request.code,
        )

    prediction = ml_advisor.predict_error(request.error.model_dump())
    result = response.model_dump()
    result.update(
        ml_category=prediction["category"] if prediction else None,
        ml_confidence=prediction["confidence"] if prediction else None,
        source=_advisory_source(gemini_used, prediction is not None),
        fix_verified=accepted_fix_count > 0,
        remaining_errors=len(remaining_errors),
    )
    return result


@app.post("/advise")
async def advise(request: AdviseRequest) -> dict:
    response, gemini_used = await ai.advise_optimizations_with_source(
        request.code, request.tac, request.optimized_tac
    )
    prediction = ml_advisor.predict_program_optimization(
        request.code, request.tac, request.optimized_tac
    )
    actual_reduction = max(0, len(request.tac) - len(request.optimized_tac))
    result = response.model_dump()
    result.update(
        ml_category=prediction["category"] if prediction else None,
        ml_confidence=prediction["confidence"] if prediction else None,
        ml_predicted_reduction=(
            prediction["estimated_reduction"] if prediction else None
        ),
        actual_reduction=actual_reduction,
        source=_advisory_source(gemini_used, prediction is not None),
    )
    return result


def _advisory_source(gemini_used: bool, ml_used: bool) -> str:
    if gemini_used and ml_used:
        return "gemini+ml"
    if ml_used:
        return "ml"
    return "rule-based"


def _unquoted_printf_diagnostics(code: str) -> list[dict[str, str | int]]:
    diagnostics = []
    for line_number, source_line in enumerate(code.splitlines(), start=1):
        code_part = source_line.split("//", 1)[0]
        call = re.match(
            r"^\s*printf\s*\(\s*(.*?)\s*\)\s*;\s*$",
            code_part,
        )
        if call and not call.group(1).lstrip().startswith('"'):
            diagnostics.append(
                {
                    "phase": "syntax",
                    "line": line_number,
                    "message": (
                        "Expected a quoted string literal as printf's first argument"
                    ),
                }
            )
    return diagnostics


def _fix_improves_diagnostics(
    before: list[ErrorResponse],
    after: list[ErrorResponse],
    targeted_error: ai.CompileError,
) -> bool:
    if not before or len(after) >= len(before):
        return False

    before_signatures = Counter((error.phase, error.message) for error in before)
    after_signatures = Counter((error.phase, error.message) for error in after)
    target_signature = (targeted_error.phase, targeted_error.message)
    return (
        before_signatures[target_signature] > after_signatures[target_signature]
        and all(
            after_signatures[signature] <= before_signatures[signature]
            for signature in after_signatures
        )
    )
