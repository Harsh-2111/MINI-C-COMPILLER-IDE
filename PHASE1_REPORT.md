# AI-Assisted Visual Compiler & Intelligent Mini-IDE (ML-Assisted Advisory Layer, Rule-Based Compiler Core)

## Proposed Approach

OptiLexis AI is an educational compiler workbench for a deliberately limited
C-like language. The compiler pipeline is deterministic: machine learning and
Gemini may explain diagnostics or offer optimization advice, but they do not
parse programs, determine whether a program is valid, generate or rewrite TAC,
or decide the compiler's result.

The user writes or selects source code in the React IDE. In live mode, the
frontend submits it to the FastAPI service. The backend performs the compiler
stages in order and returns structured JSON. The frontend then renders the
tokens, AST, symbol table, diagnostics, TAC, optimized TAC, and execution
information in separate panels.

The core pipeline is:

1. **Source code** arrives from the editor.
2. **Lexer (PLY)** turns characters into tokens and reports lexical errors.
3. **Parser (PLY yacc, LALR(1))** checks the grammar and constructs an AST.
4. **Semantic analyzer** checks declarations, scopes, types, and returns while
   building the symbol table.
5. **TAC generator** converts a semantically valid AST into three-address code.
6. **Optimizer** applies the existing deterministic TAC optimization passes.
7. **JSON output** returns tokens, AST, symbols, TAC, optimized TAC, and errors
   through FastAPI with Pydantic request/response validation.
8. **React IDE panels** display the compiler artifacts and diagnostics.
9. **ML advisory layer** can classify a diagnostic and predict optimization
   reductions; it returns metadata and advice without changing the pipeline.
10. **Optional Gemini wording layer** can produce a constrained-JSON explanation
    or advice response. If the key is absent, the request times out, or the
    response is invalid, deterministic backend fallback text is used.

```mermaid
flowchart TD
    SRC[Source code in Monaco editor] --> LEX[Lexer: PLY]
    LEX -->|Tokens and lexical checks| PAR[Parser: PLY yacc, LALR(1)]
    PAR -->|AST and syntax checks| SEM[Semantic analyzer]
    SEM -->|Symbol table and type checks| TAC[TAC generator]
    TAC --> OPT[Deterministic optimizer]
    OPT --> JSON[FastAPI JSON response]
    JSON --> UI[React IDE panels]
    DIAG[Compiler diagnostics] --> ML[ML advisory: TF-IDF and logistic regression]
    TAC --> PRED[ML advisory: random-forest predictions]
    OPT --> PRED
    ML --> META[Advisory category and confidence]
    PRED --> META
    DIAG --> GEM[Optional Gemini explanation]
    TAC --> GEM
    OPT --> GEM
    GEM --> WORDS[Constrained-JSON wording or deterministic fallback]
    META --> UI
    WORDS --> UI
    UI -. User explicitly chooses .-> FIX[Apply suggested fix]
    FIX -. Edits editor source; a new compile is required .-> SRC
```

If the backend is unavailable, the frontend can use its browser-based compiler
and interpreter. The offline compiler is a separate implementation; it is
useful for demonstrations but may differ from the backend on language edge
cases. The backend's compiler behavior remains authoritative whenever it is
connected.

## Technology

| Component | Technology and responsibility |
| --- | --- |
| Lexer and parser | Python Lex-Yacc (PLY); the parser uses yacc's LALR(1) mode and builds the AST |
| Semantic analysis | Python; scoped symbol lookup, declaration checking, type checks, and return checks |
| Intermediate representation | Deterministic three-address code (TAC) generated from the AST |
| Optimization | Deterministic rule-based TAC optimizer; ML does not select or apply passes |
| API and validation | FastAPI exposes compiler/advisory routes; Pydantic v2 validates request and response data |
| Error advisory model | scikit-learn TF-IDF vectorization with logistic regression, persisted with joblib |
| Optimization advisory models | scikit-learn random-forest classifier and regressor, persisted with joblib |
| Optional language model | Gemini through Google's official `google-genai` SDK; backend-only key, constrained JSON, timeout and fallback |
| Frontend | React and TypeScript built and served with Vite |
| Source editor | Monaco Editor |
| AST presentation | React Flow for graph presentation and Dagre for graph layout |
| Verification | pytest and FastAPI TestClient for backend tests; TypeScript check and Vite production build for frontend |
| Offline operation | In-browser compiler and interpreter used when the API is unavailable |

## Team Understanding

The team understands the compiler as an ordered set of stages with explicit
inputs and outputs. Lexing identifies token categories; LALR(1) parsing applies
the language grammar and builds a tree; semantic analysis checks names and
types within nested scopes; TAC makes operations explicit; and the optimizer
transforms TAC using fixed rules. The UI visualizes these representations so
that users can relate source code to compiler behavior.

The team also understands the boundary between compiler results and advisory
AI. The compiler pipeline is deterministic and remains the source of truth.
Model predictions are contextual hints with confidence values, not
certification of correctness. Gemini's response is constrained and validated
on the backend; it is optional and never receives a frontend-held API key. If
Gemini or model artifacts are unavailable, deterministic fallback behavior
keeps compiler use intact.

The reported ML metrics describe a fixed-seed, compiler-generated synthetic
dataset for this small grammar. The high held-out scores must not be presented
as evidence of broad performance on production C compilers or arbitrary source
code. The project is an educational mini-compiler and does not emit native
machine code.
