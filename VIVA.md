# OptiLexis AI — Viva Questions and Demo

## Likely faculty questions

### 1. What does this project do?
It is a visual mini-compiler IDE. It compiles a supported C-like language
subset and lets a user inspect tokens, the AST, symbols, diagnostics, TAC, and
optimized TAC.

### 2. Is it a complete C compiler?
No. It is an educational subset compiler and browser interpreter. It does not
support all C features or generate native machine code.

### 3. What happens to source code during compilation?
It passes through lexing, parsing, semantic analysis, TAC generation, and
optimization. The backend returns the results as JSON for the frontend panels.

### 4. What is PLY, and where is it used?
PLY is Python Lex-Yacc. Its lexer recognizes the language's tokens, and its
yacc component applies the grammar and constructs the AST.

### 5. What does LALR(1) mean here?
It is the parser strategy used by PLY yacc: it builds a bottom-up parser that
uses one token of lookahead. It is suitable for the project's defined grammar.

### 6. What is an AST?
An abstract syntax tree is a structured representation of the program. It
keeps the program's meaningful constructs while omitting irrelevant details
such as whitespace.

### 7. What is TAC?
Three-address code is a simple intermediate representation where each
instruction expresses a small operation. It makes compiler transformations
easier to inspect.

### 8. What does the symbol table store?
It records declared names and related type and scope information. Semantic
analysis uses it to detect issues such as undeclared identifiers and invalid
type use.

### 9. How does symbol table scoping work?
The analyzer keeps a stack of scopes. Name lookup searches from the innermost
scope outward, so local declarations can be resolved before outer declarations.

### 10. How is machine learning used?
It is an advisory layer. Model A classifies compiler diagnostics; Model B
predicts whether optimization reductions occur and estimates their count.
Neither model changes compilation results or optimizer behavior.

### 11. What models are used?
Model A combines a TF-IDF vectorizer with logistic regression. Model B uses a
random-forest classifier and a random-forest regressor. The artifacts are
loaded with joblib.

### 12. How was the training data made?
The error generator mutates valid mini-C samples, runs the mutations through
the real compiler pipeline, and labels the diagnostics it observes. The
optimization generator measures TAC changes from the real optimizer. A fixed
seed supports reproducible generation.

### 13. Can we claim the models are 100% accurate?
No general claim is justified. The current generated held-out set reports 1.0
accuracy for both classifiers and 0.0 MAE for reduction estimates, but the data
is synthetic and specific to this small grammar. Those metrics do not prove
generalization to full C or unseen compilers.

### 14. What does Gemini do, and what if the key is missing?
Gemini can provide explanation wording or optimization advice. The key is read
only by the backend from `backend/.env`; it is never sent from frontend code.
Without a key, on timeout, or on invalid output, deterministic rule-based
fallback text is returned.

### 15. How does the IDE work without the backend?
The frontend checks the backend health endpoint and switches to its in-browser
compiler/interpreter if the service is unavailable or a request loses
connectivity. Offline behavior is convenient for a demo, but may differ from
the backend compiler on edge cases.

## Two-minute presentation demo

| Time | Action and narration |
| --- | --- |
| 0:00–0:15 | Open the landing page and introduce OptiLexis AI as an educational visual compiler with a deterministic rule-based core. |
| 0:15–0:30 | Enter the workspace. Point out the Monaco editor, responsive compiler panels, and connected/offline status. |
| 0:30–0:50 | Choose **Fibonacci Loop** from the sample selector and click **Compile & Run**. Show the successful compile state and program result. |
| 0:50–1:10 | Open **Tokens**, **AST**, and **Symbol Table**. Explain how source text becomes structured compiler data. |
| 1:10–1:25 | Open **TAC** and **Optimization**. Point out the before/after instructions and explain that the optimizer is deterministic. |
| 1:25–1:40 | Load **Semantic Error**, compile, and show the undeclared-name diagnostic. Select **Explain with AI** to show the diagnostic category/confidence and the advisory source label. |
| 1:40–1:52 | Show the model information panel and explain that the displayed metrics belong to the generated mini-language dataset, not general C. |
| 1:52–2:00 | Close or stop the backend (or use an offline deployment) and point out the offline status/fallback. Close by reiterating that advisory AI never controls compilation. |

## Ready to submit?

- [x] Project scope and supported mini-C limitations are documented.
- [x] Compiler flow and the advisory-only ML/Gemini boundary are explained.
- [x] The README records the observed local API counts for all eight backend sample files.
- [x] Backend pytest, frontend TypeScript lint, and production build have passed in this working session.
- [x] Gemini key handling is backend-only; the Gemini live connectivity check requires a real key and was not part of the sample endpoint verification.
- [ ] Before a live Gemini demonstration, configure `GEMINI_API_KEY` in the untracked `backend/.env` and verify connectivity.
- [ ] Before claiming public deployment readiness, deploy/configure the backend and frontend API URL and smoke-test that deployment. Local verification alone does not certify a hosted deployment.

**Honest status:** Ready for an academic submission/demo of the locally verified
educational project, with the live Gemini and hosted-deployment checks above
remaining environment-dependent.
