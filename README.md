# OptiLexis AI

<p align="center">
  <img src="./public/logo-icon.png" alt="OptiLexis AI logo" width="128" />
</p>

<p align="center">
  <strong>A visual compiler and browser-based mini-IDE for learning how source code becomes a program.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776ab?logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white" />
</p>

OptiLexis AI is ML-assisted and LLM-assisted, with a rule-based compiler core. Write or load a small C-like program, compile it, inspect how it is tokenized and represented, and explore diagnostics, intermediate code, optimizations, and execution results.

> **Project scope:** OptiLexis AI is an educational mini-compiler for a supported C-like language subset. It is not a standards-complete C compiler and does not produce native machine code.

## Contents

- [What you can do](#what-you-can-do)
- [How a compile works](#how-a-compile-works)
- [How is machine learning used?](#how-is-machine-learning-used)
- [Sample verification results](#sample-verification-results)
- [Language support and limitations](#language-support-and-limitations)
- [Technology](#technology)
- [Run locally](#run-locally)
- [Optional FastAPI service](#optional-fastapi-service)
- [Deploy the frontend](#deploy-the-frontend)
- [Project structure](#project-structure)
- [Submission documents](#submission-documents)
- [Quality checks](#quality-checks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What you can do

- **Edit in the browser:** Use the Monaco-powered editor, work with multiple file tabs, and format, copy, clear, or reset the active file.
- **Start with a clean workspace:** A new browser tab opens the landing page and then starts with `main.c` containing a small starter program. Workspace files are kept in that tab's session storage, so a refresh preserves edits while a separate tab starts a separate workspace.
- **Explore tokens:** Inspect the token stream, filter by token type, search token values, and jump to the token's source line.
- **Visualize the AST:** Explore a graph of the abstract syntax tree, with controls for navigation and source-line selection.
- **Inspect compiler artifacts:** Review the symbol table, three-address code (TAC), and optimization results.
- **Understand diagnostics:** Find lexical, syntax, and semantic issues by source line.
- **Run supported programs:** Compile and execute supported programs in the browser, view printed output, and inspect a returned value when there is no printed output.
- **Get coding assistance:** Use the explain/optimization assistance surfaces. The optional backend can use Gemini when configured and otherwise provides deterministic fallback responses.
- **Use it on different screens:** The workspace adapts its editor, analysis panels, navigation, and status information for laptop and phone viewports.

### Included sample programs

The sample selector contains examples for:

| Example | What it demonstrates |
| --- | --- |
| Fibonacci Loop | A loop, variables, comparisons, and assignments |
| Function with Parameters | Function declarations, parameters, calls, and returns |
| Bool & If/Else Branches | Boolean values and conditional branches |
| Constant Folding & Dead Code | A sample for inspecting optimization output |
| Syntax Error | A missing-semicolon diagnostic |
| Semantic Error | Undeclared names and incompatible types |
| Lexical Error | An invalid-character diagnostic |

Choosing a sample loads it into the active editor file. It does **not** compile automatically; select **Compile & Run** when you are ready to see results.

## How a compile works

```text
Source code
    │
    ├── Lexical analysis ──> token stream
    ├── Parsing ───────────> abstract syntax tree (AST)
    ├── Semantic analysis ─> symbol information and diagnostics
    ├── TAC generation ────> three-address instructions
    ├── Optimization ──────> optimized TAC and change explanations
    └── Browser execution ─> printed output or return value
```

The interface presents these artifacts in separate panels so you can move between a program and the corresponding compiler representation. The browser execution engine is a small interpreter; it does not invoke a system C compiler.

## How is machine learning used?

Machine learning supports optional advice and never decides compilation outcomes.
The lexer, parser, semantic analyzer, TAC generator, and optimizer remain
deterministic and authoritative. The same rule-based compilation result is
produced whether trained models are available or not.

- **Model A — error classifier:** A TF-IDF vectorizer represents the compiler
  phase and diagnostic message as word and bigram features. Logistic regression
  predicts one of seven compiler-derived diagnostic categories.
- **Model B — optimization predictor:** Random-forest classification predicts
  whether an optimization reduction occurs, and a random-forest regressor
  estimates the number of TAC instructions reduced. Its features are TAC length,
  constant operations, unused assignments, constant branches, loop count,
  function-call count, and source nesting depth.
- **Training data:** `python -m ml.generate_dataset` creates 2,800 diagnostic
  samples by mutating valid mini-C programs and retaining labels confirmed by
  this project's actual compiler pipeline. It also creates 1,600 optimization
  samples and records actual before/after TAC length reductions from the real
  optimizer. A fixed random seed makes generation and evaluation reproducible.
- **Evaluation:** `python -m ml.train` uses a stratified 80/20 held-out split for
  the diagnostic classifier and records classifier accuracy and regressor MAE
  in `backend/ml/models/metrics.json`. The currently generated fixed-seed data
  reports 100% held-out accuracy for both classifiers and 0.00 reduction MAE.
  Those perfect scores reflect highly controlled, repeated synthetic patterns
  from this small grammar; accuracy measures this generated mini-language
  dataset and is not a claim of general-purpose C diagnostic accuracy.

The models can be regenerated using the commands in
[backend/ml/README.md](./backend/ml/README.md). If model files are missing, the
API continues with rule-based advice. Gemini is also optional and only supplies
advisory explanations. Neither ML nor Gemini changes source code or compiler
output without a user action.

## Sample verification results

Every C file in `backend/samples/` was submitted to the local FastAPI
`POST /compile` endpoint. These are the returned token, TAC, and optimized TAC
array lengths, and the diagnostics returned by that run:

| Sample Name | Token Count | TAC Lines | Optimized TAC Lines | Detected Errors |
| --- | ---: | ---: | ---: | --- |
| `bool_if_else.c` | 35 | 12 | 10 | None |
| `constant_folding.c` | 35 | 10 | 5 | None |
| `fibonacci.c` | 67 | 21 | 20 | None |
| `func_params.c` | 35 | 11 | 10 | None |
| `lexical_error.c` | 15 | 0 | 0 | lexical: illegal character `@`; syntax: expected `;` before `2` |
| `sample_lexer.c` | 20 | 0 | 0 | lexical: illegal character `@`; syntax: expected `;` before `10` |
| `semantic_error.c` | 16 | 0 | 0 | semantic: undeclared identifier `missing_value` |
| `syntax_error.c` | 18 | 0 | 0 | syntax: expected `;` before `return` |

The intentionally invalid samples return zero TAC lines because code generation
only runs after the program passes the required compiler checks. The lexer can
report a lexical error and the parser can also report a follow-on syntax error
for the same invalid source.

The three required `/explain` checks returned ML categories and confidence
scores: `lexical_error.c` → `illegal_character` (98.18%),
`syntax_error.c` → `missing_semicolon` (96.57%), and `semantic_error.c` →
`undeclared_identifier` (99.90%). `/advise` on `constant_folding.c` returned
`optimization_reduction` at 100% confidence, with 3.43 instructions predicted
versus 5 actually removed. Scores are model outputs on these particular
requests, not guarantees of correctness.

| Advisory request | ML category | Confidence | Source | Additional result |
| --- | --- | ---: | --- | --- |
| `/explain` · `lexical_error.c` | `illegal_character` | 98.18% | `ml` | Error phase: lexical |
| `/explain` · `syntax_error.c` | `missing_semicolon` | 96.57% | `ml` | Error phase: syntax |
| `/explain` · `semantic_error.c` | `undeclared_identifier` | 99.90% | `ml` | Error phase: semantic |
| `/advise` · `constant_folding.c` | `optimization_reduction` | 100.00% | `ml` | Predicted 3.43 reduced TAC lines; actual reduction: 5 |

Gemini did not contribute to the recorded requests (`source: ml`); the backend
returned its deterministic wording fallback alongside available ML
predictions.

## Language support and limitations

The project implements a teaching language inspired by C. The exact syntax and execution support are intentionally narrower than full C.

| Area | Supported examples |
| --- | --- |
| Types and values | `int`, `float`, `bool`, `void` function declarations, numeric values, `true`, and `false` |
| Expressions | Arithmetic, comparisons, equality, logical operators, and unary `!` and `-` |
| Statements | Variable declarations, assignments, function calls, `return`, `if`/`else`, and `while` |
| Functions | User-defined functions with typed parameters and return statements |
| Preprocessor | Common `#include` lines are accepted by the compiler pipeline; included libraries are not actually linked |
| Browser output | Basic `printf` string output and common `%d`, `%i`, `%u`, `%f`, `%c`, `%s`, and `%%` format specifiers |

The browser interpreter enforces a 100,000-step execution limit and a maximum function-call depth of 100 to keep execution bounded. It is not a complete implementation of C's standard library or type system. Features such as pointers, structs, arrays, file and operating-system I/O, and native compilation are outside the current interpreter's scope. A program may compile in a compiler stage but still use a feature the browser interpreter cannot execute; runtime failures are reported separately from compile diagnostics.

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Editor | Monaco Editor |
| Styling | Tailwind CSS |
| AST visualization | React Flow and Dagre |
| Backend API and compiler | Python, FastAPI, Pydantic v2, PLY (LALR(1) parser) |
| Advisory models | scikit-learn, TF-IDF, logistic regression, random forests |
| Optional AI provider | Google Gemini via the official `google-genai` SDK |
| Model persistence and data | joblib, NumPy, pandas |
| Backend tests | pytest and FastAPI TestClient |

## Run locally

### Prerequisites

- Node.js and npm
- Python 3.10 or newer for the optional backend

### Start the frontend

Run these commands from the repository root:

```powershell
npm install
npm run dev
```

Vite prints the local URL after startup (the project development script uses port `3000`). Open that URL in a browser.
You can optionally set `VITE_API_BASE_URL` in a root `.env` file to change the
backend URL used by the frontend.

The frontend checks the configured API's `/health` endpoint on startup and
when the API URL changes. When the service is available, the UI uses the live
compiler and reports backend/model status. If it is unavailable, or a live
request loses its network connection, the UI falls back to the in-browser
compiler and labels the session as offline. The in-browser compiler is a
separate implementation and may not produce identical diagnostics for every
edge case.

Available frontend scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run the TypeScript check (`tsc --noEmit`) |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

### Start the backend

In a second PowerShell terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API listens at `http://127.0.0.1:8000` by default. During local Vite
development, the frontend defaults to `http://localhost:8000`. In production,
configure `VITE_API_BASE_URL` with the deployed API URL; it intentionally does
not target a visitor's localhost. The saved API URL setting can also override
the environment default. Visit `http://127.0.0.1:8000/docs` for interactive
OpenAPI documentation.

### Current production deployment

The production frontend is deployed on Vercel (use the Production domain
currently assigned in the Vercel project), and its FastAPI compiler backend
is deployed separately on Render at
[`https://optilexis-ai-api.onrender.com`](https://optilexis-ai-api.onrender.com).
The API health check is
[`/health`](https://optilexis-ai-api.onrender.com/health); interactive API
documentation is at
[`/docs`](https://optilexis-ai-api.onrender.com/docs).

The Vercel **Production** environment uses the public, non-secret setting
`VITE_API_BASE_URL=https://optilexis-ai-api.onrender.com`. It tells the browser
where to reach the backend and is intentionally visible in the built frontend.
It is not an API key. The Render service allows the production Vercel origin
and Vercel preview origins through CORS.

When the Vercel page opens, it checks the backend health endpoint and displays
**Backend: Python PLY compiler + ML (connected)** after a successful check. If
Render is waking from an idle period, the page may briefly show a connecting
or offline status; it retries automatically and changes to connected when the
backend responds. Render free instances can sleep, so an immediate connected
status on every visit cannot be guaranteed on that plan. Use an always-on
backend plan if a warm, continuously connected status is required.

The deployment configuration is maintained in [`render.yaml`](./render.yaml).
If replacing the backend, update `VITE_API_BASE_URL` in Vercel's Production
environment and redeploy the frontend. If using a different Vercel domain,
update `FRONTEND_ORIGINS` in Render and redeploy the backend.

Gemini is optional. To enable Gemini-backed assistance in production, configure
`GEMINI_API_KEY` as a **secret environment variable on the Render backend
service**; optionally set `GEMINI_MODEL` there (defaults to
`gemini-2.5-flash`). Do not add the key to Vercel, any `VITE_` variable, source
code, or documentation. No API key is included in this repository. For local
development, put the key in the ignored `backend/.env` file based on
`backend/.env.example`; never commit that file. With no key configured, the
assistance routes use deterministic fallback responses. Check connectivity
locally with `python check_gemini.py` from `backend/`.

The checked-in advisory model artifacts are ready for local use. To regenerate
the reproducible compiler-derived datasets and model artifacts from `backend/`:

```powershell
python -m ml.generate_dataset
python -m ml.train
```

The seven diagnostic categories and optimizer feature/evaluation details are
documented in [backend/ml/README.md](./backend/ml/README.md). ML and Gemini
responses are advisory only; neither changes compiler diagnostics, TAC, or
optimizer output. `GET /ml/status` reports model availability and metrics.

## FastAPI API reference

The API is implemented in `backend/main.py` and exposes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Return service health |
| `POST` | `/compile` | Return tokens, AST, symbols, TAC, optimized TAC, and diagnostics |
| `POST` | `/explain` | Explain a supplied compiler diagnostic and suggest a fix |
| `POST` | `/advise` | Suggest optimizations from source and TAC |
| `GET` | `/ml/status` | Report advisory model availability, dataset sizes, and metrics |

`POST /compile` accepts `{"code": "<source text>"}` and returns:
`tokens` (type/value/line records), a nested `ast`, `symbols` (name/type/scope
and source metadata), `tac`, `optimized_tac`, and `errors` (phase/line/message).
When diagnostics prevent later passes from running, downstream arrays can be
empty.

`POST /explain` accepts the same source plus an `error` object with `phase`,
`line`, and `message`. It returns an explanation, a suggested fix, fixed-code
preview, ML category/confidence when a model is available, and a source label.
`POST /advise` accepts `code`, `tac`, and `optimized_tac`; it returns
optimization suggestions, ML prediction/category/confidence, and the predicted
versus actual TAC reduction. `GET /ml/status` reports model load state, model
types, generated dataset sizes, evaluation metrics, and any load error.

Example explain request:

```json
{
  "code": "int main() { int result = missing_value; return result; }",
  "error": {
    "phase": "semantic",
    "line": 1,
    "message": "Undeclared identifier 'missing_value'"
  }
}
```

An explain response includes `explanation`, `fix`, and `fixed_code`, plus
`ml_category`, `ml_confidence`, and `source` when those advisory values are
available. Source is `gemini+ml`, `ml`, or `rule-based`. Advice responses
include `suggestions` and, when available, `ml_predicted_reduction`,
`actual_reduction`, `ml_category`, `ml_confidence`, and `source`. If the model
artifacts are unavailable, ML-specific response fields can be `null`.

Example compile request:

```http
POST /compile
Content-Type: application/json
```

```json
{
  "code": "int main() { return 42; }"
}
```

Diagnostics identify their phase (`lexical`, `syntax`, or `semantic`), line
number, and message. Request bodies reject unexpected fields. See `/docs` for
the complete generated request and response schemas.

## Deploy the frontend

The frontend is a Vite static site and can be deployed to Vercel or another static hosting provider:

1. Import the repository into the hosting provider.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Deploy the project.

The static frontend's in-browser mode does not require a backend server. To
use the live service, host FastAPI separately on a Python-capable service,
configure the frontend API base URL to that service, and allow the frontend's
origin in the API's CORS configuration. Never put Gemini credentials in
frontend environment variables or browser code.

## Project structure

```text
.
├── backend/
│   ├── main.py              # FastAPI routes and compile pipeline
│   ├── lexer.py             # PLY lexer
│   ├── parser.py            # Grammar and AST construction
│   ├── ast_nodes.py         # AST node definitions
│   ├── semantic.py          # Semantic analysis and symbol table
│   ├── tac.py               # Three-address code generation
│   ├── optimizer.py         # TAC optimization passes
│   ├── ai.py                # Gemini integration and local fallbacks
│   ├── ml/                  # Dataset generation, advisory models, and metrics
│   ├── samples/             # Valid and intentionally invalid examples
│   └── tests/               # Backend unit and end-to-end tests
├── public/
│   ├── logo-icon.png
│   └── logo.png
├── src/
│   ├── App.tsx              # Workspace state and application flow
│   ├── api.ts               # Browser compiler and API client
│   ├── runtime.ts           # Browser-side interpreter
│   ├── config.ts            # App defaults and sample programs
│   ├── types/               # Shared TypeScript types
│   └── components/          # Editor, compiler panels, dialogs, and landing page
├── index.html
├── package.json
└── vite.config.ts
```

## Submission documents

- [Phase 1 technical report](./PHASE1_REPORT.md): proposed approach, pipeline
  flowchart, technology choices, and team understanding.
- [Viva questions and demo script](./VIVA.md): 15 short answers, a timed
  two-minute walkthrough, and an honest readiness checklist.

## Quality checks

Before submitting a change, run the checks from the repository root:

```powershell
npm run lint
npm run build
```

Run the backend test suite from the `backend` directory after activating its
virtual environment:

```powershell
python -m pytest -v
```

The backend tests exercise sample programs through compilation and the
assistance routes. Unit tests cover the lexer, parser, semantic analysis, TAC
generation, optimizer, Gemini fallbacks, ML predictions, and the guarantee
that ML availability does not change compiler output.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Vite cannot start | Confirm Node.js/npm are installed and dependencies are present; run `npm install` from the repository root. |
| Backend command is not found | Activate the backend virtual environment and install `backend/requirements.txt`. |
| Gemini assistance uses a fallback response | Confirm `GEMINI_API_KEY` is set in `backend/.env`, then restart the backend. Fallback responses are expected when no key is configured. |
| A program compiles but execution stops | Check the Output panel's runtime message. Compilation and browser execution are separate stages, and the interpreter supports only the subset described above. |
| Refresh does not show a new workspace | A refresh in the same tab intentionally restores that tab's session. Open a separate tab for a fresh workspace. |

## Contributing

1. Create a focused branch for your change.
2. Keep changes aligned with the supported mini-language and existing frontend/backend responsibilities.
3. Run the TypeScript check, production build, and relevant backend tests.
4. Update this README when setup steps, API behavior, language support, or project structure changes.

---

**OptiLexis AI** — making compiler stages easier to see, inspect, and understand.
