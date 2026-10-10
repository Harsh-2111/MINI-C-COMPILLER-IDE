# OptiLexis AI

OptiLexis AI is a browser-based C-like compiler and mini-IDE. Write or load a
program, compile it, and explore its tokens, abstract syntax tree, symbol table,
three-address code, optimization results, diagnostics, and program output.

## Run the web app

**Prerequisite:** Node.js

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Build the production app with
`npm run build`; run the TypeScript check with `npm run lint`.

## Compiler behavior

The app starts in its in-browser compiler mode and can also connect to the
optional FastAPI backend. Use the compiler status indicator in the app header
to open settings and configure the backend URL or compiler mode.

The in-browser interpreter supports numeric and boolean values, variables,
arithmetic and comparison operators, functions, `if`/`else`, `while`, and
`return`. It does not execute native machine code or provide operating-system
I/O.

## Run the optional backend

From the `backend` directory, create a virtual environment, install
`requirements.txt`, and start the API:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API documentation
is at `http://127.0.0.1:8000/docs`. Copy `backend/.env.example` to `backend/.env`
and set `GEMINI_API_KEY` to enable Gemini responses. Without a key, the AI
endpoints use deterministic local responses.

Run the backend test suite from `backend` with:

```powershell
python -m pytest -v
```
