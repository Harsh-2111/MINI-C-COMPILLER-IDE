"""FastAPI service exposing the OptiLexis AI compiler pipeline."""

from __future__ import annotations

from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

try:
    from . import ai
    from .lexer import tokenize
    from .optimizer import optimize_tac
    from .parser import parse
    from .semantic import analyze
    from .tac import generate_tac
except ImportError:
    import ai
    from lexer import tokenize
    from optimizer import optimize_tac
    from parser import parse
    from semantic import analyze
    from tac import generate_tac

app = FastAPI(title="OptiLexis AI Compiler API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.post("/compile", response_model=CompileResponse)
async def compile_source(request: CompileRequest) -> CompileResponse:
    tokens: list[dict] = []
    try:
        tokens, _ = tokenize(request.code)
        parsed = parse(request.code)
        errors = parsed["errors"]
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
async def explain(request: ExplainRequest) -> dict[str, str]:
    response = await ai.explain_error(request.code, request.error)
    return response.model_dump()


@app.post("/advise")
async def advise(request: AdviseRequest) -> dict:
    response = await ai.advise_optimizations(
        request.code, request.tac, request.optimized_tac
    )
    return response.model_dump()
