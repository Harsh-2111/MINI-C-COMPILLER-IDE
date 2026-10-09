<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d4c0b5b9-9520-4bc7-b2dd-993905b9fa94

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Compile and Run

Click **Compile & Run** to compile the current program and execute the supported
C-like subset in CompileScope's safe in-browser interpreter. The **Output** tab
opens automatically after a successful compile and displays the program's
return value (for example, `30` for a `main` function that returns `x + y` when
`x` is `10` and `y` is `20`). Programs with compilation errors are not executed.

The interpreter supports the language's current core features: numeric and
boolean values, variables, arithmetic and comparison operators, functions,
`if`/`else`, `while`, and `return`. It does not execute native machine code or
provide operating-system I/O.
