import { getApiBase } from './config';
import {
  CompileResponse,
  CompilerError,
  ExplainRequest,
  ExplainResponse,
  AdviseRequest,
  AdviseResponse,
  Token,
  AstNode,
  SymbolEntry,
} from './types/compiler';

/**
 * Pings backend health endpoint
 */
export async function checkBackendHealth(customBase?: string): Promise<boolean> {
  const baseUrl = customBase || getApiBase();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Compile source code via POST /compile or mock compiler
 */
export async function compileCode(
  code: string,
  isMockMode: boolean = false,
  customBase?: string
): Promise<CompileResponse> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return generateMockCompileResponse(code);
  }

  const baseUrl = customBase || getApiBase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Compiler service returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CompileResponse = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('aborted') || msg.includes('NetworkError')) {
      throw new Error(`Backend not reachable at ${baseUrl}`);
    }
    throw new Error(msg);
  }
}

/**
 * Explain an error via POST /explain or mock AI
 */
export async function explainError(
  req: ExplainRequest,
  isMockMode: boolean = false,
  customBase?: string
): Promise<ExplainResponse> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 320));
    return generateMockExplainResponse(req);
  }

  const baseUrl = customBase || getApiBase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Explain service returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ExplainResponse = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('aborted')) {
      throw new Error(`Backend not reachable at ${baseUrl}`);
    }
    throw new Error(msg);
  }
}

/**
 * Optimization Advisor via POST /advise or mock AI (when code has no errors)
 */
export async function adviseOptimization(
  req: AdviseRequest,
  isMockMode: boolean = false,
  customBase?: string
): Promise<AdviseResponse> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return generateMockAdviseResponse(req);
  }

  const baseUrl = customBase || getApiBase();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${baseUrl}/advise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Advise service returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: AdviseResponse = await response.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('aborted')) {
      throw new Error(`Backend not reachable at ${baseUrl}`);
    }
    throw new Error(msg);
  }
}

// -------------------------------------------------------------
// Production-Grade Client-Side Mock Compiler
// -------------------------------------------------------------

function generateMockCompileResponse(code: string): CompileResponse {
  const lines = code.split('\n');
  const tokens: Token[] = [];
  const errors: CompilerError[] = [];
  const symbols: SymbolEntry[] = [];

  const keywords = new Set(['int', 'float', 'bool', 'void', 'char', 'if', 'else', 'while', 'for', 'return', 'true', 'false']);
  let currentScope = 'global';
  let offsetCounter = 0;
  const knownSymbols = new Map<string, string>(); // name -> type

  // Lexical & Syntax scan
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      /^#include\s+[<"][^>\n"]+[>"]$/.test(trimmed)
    ) {
      return;
    }

    // Check lexical error: invalid character like @ or # or $
    if (lineText.includes('@') || lineText.includes('$') || (lineText.includes('#') && !trimmed.startsWith('#include'))) {
      errors.push({
        phase: 'lexical',
        line: lineNum,
        message: `Illegal unrecognized token symbol encountered: '@'`,
      });
    }

    // Tokenizer regex
    const regex = /(".*?"|[a-zA-Z_]\w*|\d+(?:\.\d+)?|<=|>=|==|!=|\&\&|\|\||[+\-*/%=<>!;,{}()\[\]])/g;
    let match;
    while ((match = regex.exec(lineText)) !== null) {
      const val = match[1];
      let tType = 'punctuation';

      if (keywords.has(val)) {
        tType = 'keyword';
      } else if (/^\d+(\.\d+)?$/.test(val)) {
        tType = 'number';
      } else if (/^[+\-*/%=<>!]+$/.test(val)) {
        tType = 'operator';
      } else if (val.startsWith('"') && val.endsWith('"')) {
        tType = 'string';
      } else if (/^[a-zA-Z_]\w*$/.test(val)) {
        tType = 'identifier';
      }

      tokens.push({
        type: tType,
        value: val,
        line: lineNum,
      });
    }

    // Scope tracking
    if (lineText.includes('add(')) currentScope = 'add()';
    else if (lineText.includes('check(')) currentScope = 'check()';
    else if (lineText.includes('main(')) currentScope = 'main()';
    else if (lineText.includes('compute(')) currentScope = 'compute()';

    // Syntax check: missing semicolon
    if (
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.endsWith(';') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('else') &&
      (trimmed.includes('=') || trimmed.includes('return') || trimmed.startsWith('int ') || trimmed.startsWith('bool ') || /^[a-zA-Z_]\w*\s+[a-zA-Z_]\w*/.test(trimmed))
    ) {
      errors.push({
        phase: 'syntax',
        line: lineNum,
        message: `Expected ';' before end of line`,
      });
    }

    // Function parameter declarations
    const fnMatch = trimmed.match(/(int|float|bool|void)\s+([a-zA-Z_]\w*)\s*\((.*?)\)/);
    if (fnMatch) {
      const fnName = fnMatch[2];
      const params = fnMatch[3];
      symbols.push({
        name: fnName,
        type: `${fnMatch[1]}()`,
        scope: 'global',
        offset: 0,
        line: lineNum,
      });
      if (params) {
        const paramList = params.split(',');
        paramList.forEach((p) => {
          const pParts = p.trim().split(/\s+/);
          if (pParts.length >= 2) {
            symbols.push({
              name: pParts[1],
              type: pParts[0],
              scope: `${fnName}()`,
              offset: offsetCounter,
              line: lineNum,
            });
            offsetCounter += 4;
            knownSymbols.set(pParts[1], pParts[0]);
          }
        });
      }
    }

    // Variable declarations: (int|float|bool)\s+name ...
    const declMatch = trimmed.match(/^(int|float|bool|char)\s+([a-zA-Z_]\w*)\s*(?:=\s*(.*?))?;/);
    if (declMatch) {
      const type = declMatch[1];
      const name = declMatch[2];
      const rhs = declMatch[3];

      symbols.push({
        name,
        type,
        scope: currentScope,
        offset: offsetCounter,
        line: lineNum,
      });
      offsetCounter += 4;
      knownSymbols.set(name, type);

      if (rhs && rhs.startsWith('"') && (type === 'int' || type === 'bool')) {
        errors.push({
          phase: 'semantic',
          line: lineNum,
          message: `Incompatible types in assignment: cannot assign string literal to '${type}' variable '${name}'`,
        });
      }
    }

    // Semantic check: undeclared variable usage
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.*?);/);
    if (assignMatch && !declMatch) {
      const lhs = assignMatch[1];
      const rhs = assignMatch[2];
      if (!knownSymbols.has(lhs) && !keywords.has(lhs)) {
        errors.push({
          phase: 'semantic',
          line: lineNum,
          message: `Undeclared identifier '${lhs}'`,
        });
      }

      const rhsTokens = rhs.match(/[a-zA-Z_]\w*/g) || [];
      for (const t of rhsTokens) {
        if (!knownSymbols.has(t) && !keywords.has(t) && isNaN(Number(t))) {
          errors.push({
            phase: 'semantic',
            line: lineNum,
            message: `Undeclared identifier '${t}'`,
          });
        }
      }
    }
  });

  // Synthesize symbols for known functions if not populated
  if (symbols.length === 0) {
    symbols.push({ name: 'main', type: 'int()', scope: 'global', offset: 0, line: 1 });
  }

  // Generate AST
  const ast = buildAstFromCode(code);

  // Generate TAC
  const { tac, optimized_tac } = generateTacFromCode(code);

  return {
    tokens,
    ast,
    symbols,
    tac,
    optimized_tac,
    errors,
  };
}

function buildAstFromCode(code: string): AstNode {
  if (code.includes('add(') && code.includes('return a + b')) {
    return {
      type: 'Program',
      label: 'Program',
      line: 1,
      children: [
        {
          type: 'FunctionDecl',
          label: 'Function: add(int a, int b) -> int',
          line: 1,
          children: [
            {
              type: 'ReturnStmt',
              label: 'Return: a + b',
              line: 2,
              children: [
                {
                  type: 'BinaryExpr',
                  label: '+ (Add)',
                  line: 2,
                  children: [
                    { type: 'Identifier', label: 'a', line: 2 },
                    { type: 'Identifier', label: 'b', line: 2 },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'FunctionDecl',
          label: 'Function: main() -> int',
          line: 5,
          children: [
            {
              type: 'VarDecl',
              label: 'VarDecl: x = add(2, 3)',
              line: 6,
              children: [
                {
                  type: 'CallExpr',
                  label: 'Call: add',
                  line: 6,
                  children: [
                    { type: 'Literal', label: '2', line: 6 },
                    { type: 'Literal', label: '3', line: 6 },
                  ],
                },
              ],
            },
            {
              type: 'ReturnStmt',
              label: 'Return: x',
              line: 7,
              children: [{ type: 'Identifier', label: 'x', line: 7 }],
            },
          ],
        },
      ],
    };
  }

  if (code.includes('check(') || code.includes('bool')) {
    return {
      type: 'Program',
      label: 'Program',
      line: 1,
      children: [
        {
          type: 'FunctionDecl',
          label: 'Function: check(int val) -> bool',
          line: 1,
          children: [
            {
              type: 'IfStmt',
              label: 'If (val > 10)',
              line: 2,
              children: [
                {
                  type: 'BinaryExpr',
                  label: '> (Gt)',
                  line: 2,
                  children: [
                    { type: 'Identifier', label: 'val', line: 2 },
                    { type: 'Literal', label: '10', line: 2 },
                  ],
                },
                { type: 'ReturnStmt', label: 'Return: true', line: 3 },
                { type: 'ReturnStmt', label: 'Return: false', line: 5 },
              ],
            },
          ],
        },
        {
          type: 'FunctionDecl',
          label: 'Function: main() -> int',
          line: 9,
          children: [
            { type: 'VarDecl', label: 'int score = 15', line: 10 },
            {
              type: 'VarDecl',
              label: 'bool ok = check(score)',
              line: 11,
              children: [{ type: 'CallExpr', label: 'Call: check(score)', line: 11 }],
            },
            { type: 'ReturnStmt', label: 'Return: 0', line: 12 },
          ],
        },
      ],
    };
  }

  if (code.includes('compute') || code.includes('10 * 5')) {
    return {
      type: 'Program',
      label: 'Program',
      line: 1,
      children: [
        {
          type: 'FunctionDecl',
          label: 'Function: compute() -> int',
          line: 1,
          children: [
            {
              type: 'Block',
              label: 'CompoundStmt',
              line: 1,
              children: [
                {
                  type: 'VarDecl',
                  label: 'x = 10 * 5 + 2',
                  line: 2,
                  children: [
                    {
                      type: 'BinaryExpr',
                      label: '+ (Add)',
                      line: 2,
                      children: [
                        {
                          type: 'BinaryExpr',
                          label: '* (Mul)',
                          line: 2,
                          children: [
                            { type: 'Literal', label: '10', line: 2 },
                            { type: 'Literal', label: '5', line: 2 },
                          ],
                        },
                        { type: 'Literal', label: '2', line: 2 },
                      ],
                    },
                  ],
                },
                { type: 'VarDecl', label: 'y = 20', line: 3 },
                { type: 'VarDecl', label: 'z = x * 2', line: 4 },
                { type: 'ReturnStmt', label: 'Return: z + y', line: 12 },
              ],
            },
          ],
        },
      ],
    };
  }

  // Default Loop / Main AST
  return {
    type: 'Program',
    label: 'Program',
    line: 1,
    children: [
      {
        type: 'FunctionDecl',
        label: 'Function: main() -> int',
        line: 1,
        children: [
          {
            type: 'Block',
            label: 'CompoundStmt',
            line: 1,
            children: [
              {
                type: 'VarDeclGroup',
                label: 'Declarations',
                line: 2,
                children: [
                  { type: 'VarDecl', label: 'int n = 8', line: 2 },
                  { type: 'VarDecl', label: 'int a = 0', line: 3 },
                  { type: 'VarDecl', label: 'int b = 1', line: 4 },
                ],
              },
              {
                type: 'WhileStmt',
                label: 'While (i <= n)',
                line: 8,
                children: [
                  {
                    type: 'BinaryExpr',
                    label: '<= (Le)',
                    line: 8,
                    children: [
                      { type: 'Identifier', label: 'i', line: 8 },
                      { type: 'Identifier', label: 'n', line: 8 },
                    ],
                  },
                  {
                    type: 'Block',
                    label: 'Loop Body',
                    line: 9,
                    children: [
                      { type: 'AssignStmt', label: 'next = a + b', line: 9 },
                      { type: 'AssignStmt', label: 'a = b', line: 10 },
                      { type: 'AssignStmt', label: 'b = next', line: 11 },
                    ],
                  },
                ],
              },
              {
                type: 'ReturnStmt',
                label: 'Return: b',
                line: 15,
                children: [{ type: 'Identifier', label: 'b', line: 15 }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function generateTacFromCode(code: string): { tac: string[]; optimized_tac: string[] } {
  if (code.includes('add(') && code.includes('return a + b')) {
    const raw = [
      '// Function add(a, b)',
      'label add:',
      't0 = a + b',
      'return t0',
      '// Function main()',
      'label main:',
      'param 2',
      'param 3',
      't1 = call add, 2',
      'x = t1',
      'return x',
    ];
    const opt = [
      '// Inlined & Tail Optimized',
      'label main:',
      'x = 5             // Inlined & constant folded: 2 + 3',
      'return 5',
    ];
    return { tac: raw, optimized_tac: opt };
  }

  if (code.includes('check(') || code.includes('bool')) {
    const raw = [
      'label check:',
      't0 = val > 10',
      'if_false t0 goto L_ELSE',
      'return 1',
      'goto L_END',
      'label L_ELSE:',
      'return 0',
      'label L_END:',
      'label main:',
      'score = 15',
      'param score',
      't1 = call check, 1',
      'ok = t1',
      'return 0',
    ];
    const opt = [
      'label main:',
      'score = 15',
      'ok = 1            // Constant evaluated condition (15 > 10)',
      'return 0',
    ];
    return { tac: raw, optimized_tac: opt };
  }

  if (code.includes('compute') || code.includes('10 * 5')) {
    const raw = [
      't0 = 10 * 5',
      't1 = t0 + 2',
      'x = t1',
      'y = 20',
      't2 = x * 2',
      'z = t2',
      'dead_var = 999',
      't3 = 0 == 1',
      'if_false t3 goto L1',
      't4 = 100 * 4',
      'dead_calc = t4',
      'return dead_calc',
      'label L1:',
      't5 = z + y',
      'result = t5',
      'return result',
    ];

    const opt = [
      'x = 52            // Constant folded: (10 * 5) + 2',
      'y = 20',
      'z = 104           // Propagated & folded: 52 * 2',
      '// dead_var = 999 removed (Dead assignment)',
      '// Unreachable if (0 == 1) branch eliminated',
      'result = 124      // Folded: z + y',
      'return result',
    ];

    return { tac: raw, optimized_tac: opt };
  }

  // Default Loop TAC
  const raw = [
    'n = 8',
    'a = 0',
    'b = 1',
    'i = 2',
    'next = 0',
    'label L_LOOP_START:',
    't0 = i <= n',
    'if_false t0 goto L_LOOP_END',
    't1 = a + b',
    'next = t1',
    'a = b',
    'b = next',
    't2 = i + 1',
    'i = t2',
    'goto L_LOOP_START',
    'label L_LOOP_END:',
    'return b',
  ];

  const opt = [
    'n = 8',
    'a = 0',
    'b = 1',
    'i = 2',
    'label L_LOOP_START:',
    't0 = i <= 8       // Constant propagated n = 8',
    'if_false t0 goto L_LOOP_END',
    't1 = a + b',
    'a = b',
    'b = t1            // Copy propagated: avoided next assignment',
    'i = i + 1',
    'goto L_LOOP_START',
    'label L_LOOP_END:',
    'return b',
  ];

  return { tac: raw, optimized_tac: opt };
}

function generateMockExplainResponse(req: ExplainRequest): ExplainResponse {
  const { error, code } = req;
  const lineNum = error.line || 1;

  if (error.phase === 'syntax') {
    const fixedLines = code.split('\n').map((l, i) => {
      if (i + 1 === lineNum && !l.trim().endsWith(';')) {
        return l + ';';
      }
      return l;
    });

    return {
      explanation: `Syntax error on line ${lineNum}: Statements must terminate with a semicolon ';'. The parser encountered the next token before closing the previous statement.`,
      fix: `Add a terminating ';' at the end of line ${lineNum}.`,
      fixed_code: fixedLines.join('\n'),
    };
  }

  if (error.phase === 'semantic') {
    if (error.message.includes('undeclared') || error.message.includes('undeclared_var')) {
      const fixedCode = code
        .replace('int count = 10;', 'int count = 10;\n    int undeclared_var = 5;')
        .replace('"incompatible_string"', '1');

      return {
        explanation: `Semantic error: Identifier 'undeclared_var' is referenced without declaration in the active scope. Variable 'status' also received a type mismatch assignment.`,
        fix: `Declare 'int undeclared_var = 5;' before reading it, and assign an integer value to 'status'.`,
        fixed_code: fixedCode,
      };
    }

    const fixedCode = code.replace(/"[^"]*"/, '0');
    return {
      explanation: `Semantic error: Incompatible types in assignment expression.`,
      fix: `Ensure assigned expression type matches the declared variable type.`,
      fixed_code: fixedCode,
    };
  }

  if (error.phase === 'lexical') {
    const fixedCode = code.replace('@', '*');
    return {
      explanation: `Lexical scanner rejected illegal symbol '@'. Valid operators are +, -, *, /, %, ==, !=, <, <=, >, >=.`,
      fix: `Replace '@' with a valid binary arithmetic operator such as '*'.`,
      fixed_code: fixedCode,
    };
  }

  return {
    explanation: `Compiler diagnostic on line ${lineNum}: [${error.phase}] ${error.message}.`,
    fix: `Check line ${lineNum} for compliance with the grammar specification.`,
    fixed_code: code,
  };
}

function generateMockAdviseResponse(req: AdviseRequest): AdviseResponse {
  const suggestions = [
    {
      title: 'Loop-Invariant Hoisting',
      detail: 'Identify variables unchanged across loop iterations and hoist definitions to the loop preheader to eliminate redundant recomputations.',
      line: req.code.includes('while') ? 8 : null,
    },
    {
      title: 'Common Subexpression Elimination',
      detail: 'Register allocation can reuse quad temporaries (t0, t1) rather than generating redundant temporary register allocations.',
      line: null,
    },
    {
      title: 'Dead Assignment Pruning',
      detail: 'Liveness analysis confirms values without downstream consumers can be safely eliminated prior to target assembly emission.',
      line: null,
    },
  ];

  return { suggestions };
}
