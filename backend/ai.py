"""Validated Gemini responses with deterministic rule-based fallbacks."""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field

load_dotenv(Path(__file__).with_name(".env"))

_TIMEOUT_SECONDS = 15
_API_KEY = os.getenv("GEMINI_API_KEY")


class ExplanationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    explanation: str = Field(min_length=1)
    fix: str = Field(min_length=1)
    fixed_code: str


class Suggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    detail: str = Field(min_length=1)
    line: int | None = None


class AdviceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    suggestions: list[Suggestion]


class CompileError(BaseModel):
    phase: str
    line: int
    message: str


def _model(response_model: type[BaseModel]):
    if not _API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=_API_KEY)
        return genai.GenerativeModel(
            "gemini-1.5-flash",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": response_model,
                "temperature": 0.2,
            },
        )
    except Exception:
        return None


async def explain_error(
    code: str, error: CompileError | dict
) -> ExplanationResponse:
    error_model = error if isinstance(error, CompileError) else CompileError.model_validate(error)
    model = _model(ExplanationResponse)
    if model is not None:
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    _explanation_prompt(code, error_model),
                    request_options={"timeout": _TIMEOUT_SECONDS},
                ),
                timeout=_TIMEOUT_SECONDS,
            )
            data = _parse_json(response.text)
            return ExplanationResponse.model_validate(data)
        except (asyncio.TimeoutError, ValueError, TypeError, AttributeError, json.JSONDecodeError):
            pass
        except Exception:
            pass
    return _fallback_explanation(code, error_model)


async def advise_optimizations(
    code: str, tac: list[str], optimized_tac: list[str]
) -> AdviceResponse:
    model = _model(AdviceResponse)
    if model is not None:
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    _advice_prompt(code, tac, optimized_tac),
                    request_options={"timeout": _TIMEOUT_SECONDS},
                ),
                timeout=_TIMEOUT_SECONDS,
            )
            return AdviceResponse.model_validate(_parse_json(response.text))
        except (asyncio.TimeoutError, ValueError, TypeError, AttributeError, json.JSONDecodeError):
            pass
        except Exception:
            pass
    return _fallback_advice(tac, optimized_tac)


def _explanation_prompt(code: str, error: CompileError) -> str:
    return (
        "Return only JSON matching the requested schema. Explain this compiler error "
        "concisely and suggest a safe fix. Preserve unrelated source code.\n"
        f"Source:\n{code}\nError: {error.model_dump_json()}"
    )


def _advice_prompt(code: str, tac: list[str], optimized_tac: list[str]) -> str:
    schema = AdviceResponse.model_json_schema()
    return (
        "Return JSON only matching this JSON schema. Offer actionable compiler "
        "optimization suggestions, with source line numbers when clear.\n"
        f"Schema: {json.dumps(schema)}\nSource:\n{code}\n"
        f"TAC: {json.dumps(tac)}\nOptimized TAC: {json.dumps(optimized_tac)}"
    )


def _parse_json(text: str) -> dict:
    text = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.DOTALL)
    if fenced:
        text = fenced.group(1)
    result = json.loads(text)
    if not isinstance(result, dict):
        raise ValueError("AI response must be a JSON object")
    return result


def _fallback_explanation(code: str, error: CompileError) -> ExplanationResponse:
    message = error.message
    explanation = "The source contains an error detected during compilation."
    fix = "Review the reported line and correct the invalid construct."
    fixed_code = code

    if error.phase == "lexical" and "Illegal character" in message:
        bad_character = message.partition("'")[2].partition("'")[0]
        explanation = f"The lexer does not recognize the character {bad_character!r}."
        fix = f"Remove {bad_character!r} or replace it with a valid language token."
        fixed_code = _remove_at_line(code, error.line, bad_character)
    elif error.phase == "syntax" and "Expected ';'" in message:
        explanation = "A statement is missing its terminating semicolon."
        fix = "Add a semicolon at the end of the statement on the reported line."
        fixed_code = _insert_semicolon(code, error.line)
    elif "Undeclared identifier" in message:
        name = message.partition("'")[2].partition("'")[0]
        explanation = f"The name {name!r} is used before it has been declared in this scope."
        fix = f"Declare {name!r} in the current scope or correct the spelling."
    elif "Redeclaration" in message:
        explanation = "A name is declared more than once in the same scope."
        fix = "Rename one declaration or remove the duplicate declaration."
    elif "Type mismatch" in message:
        explanation = "An expression's type is incompatible with the value or return type expected here."
        fix = "Use a compatible type or perform an explicit conversion supported by the language."
    elif "undefined function" in message:
        explanation = "The program calls a function that has no definition."
        fix = "Define the function or correct the called function's name."
    elif "expects" in message and "arguments" in message:
        explanation = "The function call supplies a different number of arguments than the function declares."
        fix = "Pass the expected number of arguments in the function's declared order."
    elif "Missing return" in message:
        explanation = "A non-void function can reach its end without returning a value."
        fix = "Return a value of the declared type on every control-flow path."

    return ExplanationResponse(
        explanation=explanation,
        fix=fix,
        fixed_code=fixed_code,
    )


def _fallback_advice(tac: list[str], optimized_tac: list[str]) -> AdviceResponse:
    suggestions = []
    removed = len(tac) - len(optimized_tac)
    if removed > 0:
        suggestions.append(
            Suggestion(
                title="Review eliminated instructions",
                detail=(
                    f"The optimizer removed or folded {removed} TAC instruction(s). "
                    "Confirm the resulting control flow and observable behavior."
                ),
            )
        )
    if any("call " in instruction for instruction in tac):
        suggestions.append(
            Suggestion(
                title="Consider call overhead",
                detail="Avoid repeated calls inside loops when their results can safely be reused.",
            )
        )
    if any("goto " in instruction for instruction in optimized_tac):
        suggestions.append(
            Suggestion(
                title="Inspect control-flow paths",
                detail="Review loop and branch targets to identify redundant branches or repeated work.",
            )
        )
    if not suggestions:
        suggestions.append(
            Suggestion(
                title="Keep the implementation straightforward",
                detail="No obvious TAC reduction was found; profile before applying further optimizations.",
            )
        )
    return AdviceResponse(suggestions=suggestions)


def _remove_at_line(code: str, line_number: int, character: str) -> str:
    lines = code.splitlines()
    if 1 <= line_number <= len(lines):
        lines[line_number - 1] = lines[line_number - 1].replace(character, "", 1)
    return "\n".join(lines)


def _insert_semicolon(code: str, line_number: int) -> str:
    lines = code.splitlines()
    if 1 <= line_number <= len(lines):
        candidate = lines[line_number - 1].rstrip()
        if candidate and not candidate.endswith((";", "{", "}")):
            lines[line_number - 1] = candidate + ";"
    return "\n".join(lines)
