"""Validated Gemini responses with deterministic rule-based fallbacks."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field

load_dotenv(Path(__file__).with_name(".env"))

_TIMEOUT_SECONDS = 15
_DEFAULT_MODEL = "gemini-2.5-flash"
_logger = logging.getLogger(__name__)


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


@lru_cache(maxsize=1)
def _client(api_key: str):
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=_TIMEOUT_SECONDS * 1000),
    )


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL


async def _request_json(
    prompt: str, response_model: type[BaseModel]
) -> BaseModel | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        client = _client(api_key)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_model,
            temperature=0.2,
        )
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=_model_name(),
                contents=prompt,
                config=config,
            ),
            timeout=_TIMEOUT_SECONDS,
        )
        if not response.text:
            raise ValueError("Gemini returned an empty response")
        return response_model.model_validate(_parse_json(response.text))
    except asyncio.TimeoutError:
        _logger.warning(
            "Gemini request timed out after %s seconds; using deterministic fallback",
            _TIMEOUT_SECONDS,
        )
    except (ValueError, TypeError, json.JSONDecodeError) as exception:
        _logger.warning(
            "Gemini response validation failed (%s); using deterministic fallback",
            exception,
        )
    except Exception:
        _logger.exception("Gemini request failed; using deterministic fallback")
    return None


async def explain_error_with_source(
    code: str, error: CompileError | dict[str, Any]
) -> tuple[ExplanationResponse, bool]:
    error_model = (
        error if isinstance(error, CompileError) else CompileError.model_validate(error)
    )
    if _is_int_function_returning_void(error_model):
        return _fallback_explanation(code, error_model), False

    response = await _request_json(
        _explanation_prompt(code, error_model),
        ExplanationResponse,
    )
    if isinstance(response, ExplanationResponse):
        return response, True
    return _fallback_explanation(code, error_model), False


async def explain_error(
    code: str, error: CompileError | dict[str, Any]
) -> ExplanationResponse:
    response, _ = await explain_error_with_source(code, error)
    return response


async def advise_optimizations_with_source(
    code: str, tac: list[str], optimized_tac: list[str]
) -> tuple[AdviceResponse, bool]:
    response = await _request_json(
        _advice_prompt(code, tac, optimized_tac),
        AdviceResponse,
    )
    if isinstance(response, AdviceResponse):
        return response, True
    return _fallback_advice(tac, optimized_tac), False


async def advise_optimizations(
    code: str, tac: list[str], optimized_tac: list[str]
) -> AdviceResponse:
    response, _ = await advise_optimizations_with_source(code, tac, optimized_tac)
    return response


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


def _parse_json(text: str) -> dict[str, Any]:
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

    if _is_int_function_returning_void(error):
        explanation = (
            "This function is declared to return int, but this return statement "
            "does not return a value."
        )
        fix = "Return an integer value from the function."
        fixed_code = _return_zero(code, error.line)
    elif error.phase == "lexical" and "Illegal character" in message:
        bad_character = message.partition("'")[2].partition("'")[0]
        explanation = f"The lexer does not recognize the character {bad_character!r}."
        fix = f"Remove {bad_character!r} or replace it with a valid language token."
        fixed_code = _remove_at_line(code, error.line, bad_character)
    elif error.phase == "syntax" and "Expected ';'" in message:
        explanation = "A statement is missing its terminating semicolon."
        fix = "Add a semicolon at the end of the statement on the reported line."
        fixed_code = _insert_semicolon(code, error.line)
    elif error.phase == "syntax" and "quoted string literal" in message:
        explanation = (
            "The first argument to printf must be a quoted string literal."
        )
        fix = "Enclose the printf text in double quotes."
        fixed_code = _quote_printf_argument(code, error.line)
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


def _is_int_function_returning_void(error: CompileError) -> bool:
    return (
        error.phase == "semantic"
        and re.search(
            r"returns ['\"]int['\"] but got ['\"]void['\"]",
            error.message,
            flags=re.IGNORECASE,
        )
        is not None
    )


def _return_zero(code: str, line_number: int) -> str:
    lines = code.splitlines()
    index = line_number - 1
    if not 0 <= index < len(lines):
        return code

    line = lines[index]
    match = re.match(r"^(\s*)return\s*;(\s*(?://.*)?)$", line)
    if not match:
        return code
    lines[index] = f"{match.group(1)}return 0;{match.group(2)}"
    return "\n".join(lines)


def _quote_printf_argument(code: str, line_number: int) -> str:
    lines = code.splitlines()
    index = line_number - 1
    if not 0 <= index < len(lines):
        return code

    line = lines[index]
    call = re.match(r'^(\s*printf\s*\()\s*(.*?)\s*(\)\s*;\s*(?://.*)?)$', line)
    if not call or call.group(2).lstrip().startswith('"'):
        return code
    contents = call.group(2).strip().replace("\\", "\\\\").replace('"', '\\"')
    lines[index] = f'{call.group(1)}"{contents}"{call.group(3)}'
    return "\n".join(lines)


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
