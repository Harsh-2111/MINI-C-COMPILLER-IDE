# OptiLexis AI Backend

FastAPI backend for the OptiLexis AI visual compiler. It tokenizes source code,
parses it into a serialized AST, checks semantic rules, generates
three-address code (TAC), and optimizes that TAC. `/explain` and `/advise` use
Gemini when configured, with deterministic local fallbacks when it is not.

## Architecture

```text
Browser / Mini-IDE
        |
        | JSON requests (CORS enabled)
        v
   FastAPI API (main.py)
     |       |        |
     |       |        +--> AI service (ai.py) --> Gemini or rule-based fallback
     |       |
     |       +--> Compile pipeline
     |              |
     |              +--> Lexer (lexer.py) --> tokens
     |              +--> Parser (parser.py) --> AST + syntax errors
     |              +--> Semantic analyzer (semantic.py) --> symbols + errors
     |              +--> TAC generator (tac.py) --> TAC
     |              +--> Optimizer (optimizer.py) --> optimized TAC
     |
     +--> JSON responses
```

## Setup and run

From this directory:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and set GEMINI_API_KEY to enable Gemini responses.
python -m uvicorn main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive OpenAPI docs are
at `http://127.0.0.1:8000/docs`. Gemini configuration is optional: without a
key, AI endpoints automatically return rule-based results.

Run all unit and end-to-end tests:

```powershell
python -m pytest -v
```

## API

### `GET /health`

Returns `{"status":"ok"}`.

### `POST /compile`

Request:

```json
{"code":"int main() { return 42; }"}
```

Returns tokens, the frontend-compatible AST, symbols, raw TAC, optimized TAC,
and lexical/syntax/semantic errors:

```json
{
  "tokens": [{"type": "keyword", "value": "int", "line": 1}],
  "ast": {
    "type": "Program",
    "label": "Program",
    "line": 1,
    "children": []
  },
  "symbols": [],
  "tac": ["label main:", "return 42"],
  "optimized_tac": ["label main:", "return 42"],
  "errors": []
}
```

The sample AST above is shortened for documentation. On lexical, syntax, or
semantic errors, `/compile` returns HTTP 200 with diagnostics in `errors` and
empty TAC output.

### `POST /explain`

Request:

```json
{
  "code": "int main() { return missing; }",
  "error": {
    "phase": "semantic",
    "line": 1,
    "message": "Undeclared identifier 'missing'"
  }
}
```

Returns `explanation`, `fix`, and `fixed_code`. Gemini output is JSON-only and
validated with Pydantic. Calls have an approximately 15-second deadline;
missing credentials, request failures, timeouts, and invalid JSON use the
rule-based response.

### `POST /advise`

Request:

```json
{
  "code": "int main() { return 1 + 2; }",
  "tac": ["label main:", "t1 = 1 + 2", "return t1"],
  "optimized_tac": ["label main:", "return 3"]
}
```

Returns:

```json
{"suggestions":[{"title":"...","detail":"...","line":null}]}
```

## Sample programs

| File | Demonstrates |
| --- | --- |
| `samples/fibonacci.c` | Function calls and a loop |
| `samples/func_params.c` | Parameters and return values |
| `samples/bool_if_else.c` | Boolean conditions and `if`/`else` |
| `samples/constant_folding.c` | Folding, constant branches, dead assignments |
| `samples/syntax_error.c` | Missing semicolon |
| `samples/semantic_error.c` | Undeclared identifier |
| `samples/lexical_error.c` | Illegal character recovery |

All samples are exercised by `tests/test_e2e.py` through `/compile`,
`/explain`, `/advise`, and `/health`.
