type Value = number | boolean | undefined;

type Expression =
  | { kind: 'literal'; value: Value }
  | { kind: 'identifier'; name: string }
  | { kind: 'unary'; operator: string; operand: Expression }
  | { kind: 'binary'; operator: string; left: Expression; right: Expression }
  | { kind: 'call'; name: string; arguments: Expression[] };

type Statement =
  | { kind: 'block'; statements: Statement[] }
  | { kind: 'declaration'; name: string; initializer?: Expression }
  | { kind: 'assignment'; name: string; value: Expression }
  | { kind: 'expression'; expression: Expression }
  | { kind: 'return'; expression?: Expression }
  | { kind: 'if'; condition: Expression; thenBranch: Statement; elseBranch?: Statement }
  | { kind: 'while'; condition: Expression; body: Statement };

interface FunctionDefinition {
  parameters: string[];
  body: Statement;
}

interface Token {
  value: string;
}

const TYPES = new Set(['int', 'float', 'bool', 'void']);
const PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

class SourceParser {
  private readonly tokens: Token[];
  private position = 0;
  readonly functions = new Map<string, FunctionDefinition>();

  constructor(source: string) {
    this.tokens = tokenize(source);
  }

  parseProgram(): void {
    while (!this.atEnd()) {
      this.expectType();
      const name = this.expectIdentifier();
      this.expect('(');
      const parameters: string[] = [];
      if (!this.match(')')) {
        do {
          this.expectType();
          parameters.push(this.expectIdentifier());
        } while (this.match(','));
        this.expect(')');
      }
      const body = this.parseBlock();
      this.functions.set(name, { parameters, body });
    }
  }

  private parseStatement(): Statement {
    if (this.match('{')) {
      return this.parseBlockAfterOpen();
    }
    if (this.match('if')) {
      this.expect('(');
      const condition = this.parseExpression();
      this.expect(')');
      const thenBranch = this.parseStatement();
      const elseBranch = this.match('else') ? this.parseStatement() : undefined;
      return { kind: 'if', condition, thenBranch, elseBranch };
    }
    if (this.match('while')) {
      this.expect('(');
      const condition = this.parseExpression();
      this.expect(')');
      return { kind: 'while', condition, body: this.parseStatement() };
    }
    if (this.match('return')) {
      const expression = this.check(';') ? undefined : this.parseExpression();
      this.expect(';');
      return { kind: 'return', expression };
    }
    if (TYPES.has(this.peek().value) && this.peek().value !== 'void') {
      this.advance();
      const name = this.expectIdentifier();
      const initializer = this.match('=') ? this.parseExpression() : undefined;
      this.expect(';');
      return { kind: 'declaration', name, initializer };
    }

    if (this.peek().value.match(/^[A-Za-z_]\w*$/) && this.peekNext().value === '=') {
      const name = this.advance().value;
      this.expect('=');
      const value = this.parseExpression();
      this.expect(';');
      return { kind: 'assignment', name, value };
    }

    const expression = this.parseExpression();
    this.expect(';');
    return { kind: 'expression', expression };
  }

  private parseBlock(): Statement {
    this.expect('{');
    return this.parseBlockAfterOpen();
  }

  private parseBlockAfterOpen(): Statement {
    const statements: Statement[] = [];
    while (!this.check('}') && !this.atEnd()) {
      statements.push(this.parseStatement());
    }
    this.expect('}');
    return { kind: 'block', statements };
  }

  private parseExpression(minimumPrecedence = 1): Expression {
    let left = this.parseUnary();
    while (true) {
      const operator = this.peek().value;
      const precedence = PRECEDENCE[operator] ?? 0;
      if (precedence < minimumPrecedence) break;
      this.advance();
      const right = this.parseExpression(precedence + 1);
      left = { kind: 'binary', operator, left, right };
    }
    return left;
  }

  private parseUnary(): Expression {
    if (this.match('!') || this.match('-')) {
      const operator = this.previous().value;
      return { kind: 'unary', operator, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    if (this.match('(')) {
      const expression = this.parseExpression();
      this.expect(')');
      return expression;
    }
    if (this.match('true')) return { kind: 'literal', value: true };
    if (this.match('false')) return { kind: 'literal', value: false };

    const token = this.advance();
    if (/^\d+(?:\.\d+)?$/.test(token.value)) {
      return { kind: 'literal', value: Number(token.value) };
    }
    if (!/^[A-Za-z_]\w*$/.test(token.value)) {
      throw new Error(`Unexpected token '${token.value}' in expression`);
    }

    if (this.match('(')) {
      const args: Expression[] = [];
      if (!this.check(')')) {
        do {
          args.push(this.parseExpression());
        } while (this.match(','));
      }
      this.expect(')');
      return { kind: 'call', name: token.value, arguments: args };
    }
    return { kind: 'identifier', name: token.value };
  }

  private expectType(): string {
    if (!TYPES.has(this.peek().value)) {
      throw new Error(`Expected a type, got '${this.peek().value}'`);
    }
    return this.advance().value;
  }

  private expectIdentifier(): string {
    const value = this.advance().value;
    if (!/^[A-Za-z_]\w*$/.test(value)) {
      throw new Error(`Expected an identifier, got '${value}'`);
    }
    return value;
  }

  private expect(value: string): void {
    if (!this.match(value)) {
      throw new Error(`Expected '${value}', got '${this.peek().value}'`);
    }
  }

  private match(value: string): boolean {
    if (!this.check(value)) return false;
    this.advance();
    return true;
  }

  private check(value: string): boolean {
    return this.peek().value === value;
  }

  private advance(): Token {
    if (!this.atEnd()) this.position += 1;
    return this.tokens[this.position - 1] ?? { value: '' };
  }

  private peek(): Token {
    return this.tokens[this.position] ?? { value: '' };
  }

  private peekNext(): Token {
    return this.tokens[this.position + 1] ?? { value: '' };
  }

  private previous(): Token {
    return this.tokens[this.position - 1] ?? { value: '' };
  }

  private atEnd(): boolean {
    return this.position >= this.tokens.length;
  }
}

class ProgramRunner {
  private readonly functions: Map<string, FunctionDefinition>;
  private readonly scopes: Map<string, Value>[] = [];
  private callDepth = 0;
  private steps = 0;

  constructor(functions: Map<string, FunctionDefinition>) {
    this.functions = functions;
  }

  run(): Value {
    if (!this.functions.has('main')) {
      throw new Error("No 'main' function was found to run");
    }
    return this.callFunction('main', []);
  }

  private callFunction(name: string, args: Value[]): Value {
    const definition = this.functions.get(name);
    if (!definition) throw new Error(`Call to undefined function '${name}'`);
    if (args.length !== definition.parameters.length) {
      throw new Error(
        `Function '${name}' expects ${definition.parameters.length} arguments but got ${args.length}`
      );
    }
    this.callDepth += 1;
    if (this.callDepth > 100) {
      throw new Error('Maximum function call depth exceeded');
    }

    const parameters = new Map<string, Value>();
    definition.parameters.forEach((parameter, index) => parameters.set(parameter, args[index]));
    this.scopes.push(parameters);
    try {
      const result = this.execute(definition.body);
      return result.returned ? result.value : undefined;
    } finally {
      this.scopes.pop();
      this.callDepth -= 1;
    }
  }

  private execute(statement: Statement): { returned: boolean; value?: Value } {
    this.steps += 1;
    if (this.steps > 100_000) {
      throw new Error('Execution stopped after reaching the 100,000-step safety limit');
    }

    switch (statement.kind) {
      case 'block': {
        this.scopes.push(new Map<string, Value>());
        try {
          for (const child of statement.statements) {
            const result = this.execute(child);
            if (result.returned) return result;
          }
          return { returned: false };
        } finally {
          this.scopes.pop();
        }
      }
      case 'declaration': {
        const scope = this.scopes[this.scopes.length - 1];
        if (scope.has(statement.name)) {
          throw new Error(`Variable '${statement.name}' is already declared in this scope`);
        }
        scope.set(
          statement.name,
          statement.initializer ? this.evaluate(statement.initializer) : undefined
        );
        return { returned: false };
      }
      case 'assignment':
        this.assign(statement.name, this.evaluate(statement.value));
        return { returned: false };
      case 'expression':
        this.evaluate(statement.expression);
        return { returned: false };
      case 'return':
        return {
          returned: true,
          value: statement.expression ? this.evaluate(statement.expression) : undefined,
        };
      case 'if':
        if (this.asBoolean(this.evaluate(statement.condition))) {
          return this.execute(statement.thenBranch);
        }
        return statement.elseBranch
          ? this.execute(statement.elseBranch)
          : { returned: false };
      case 'while':
        while (this.asBoolean(this.evaluate(statement.condition))) {
          const result = this.execute(statement.body);
          if (result.returned) return result;
          this.steps += 1;
          if (this.steps > 100_000) {
            throw new Error('Execution stopped after reaching the 100,000-step safety limit');
          }
        }
        return { returned: false };
    }
  }

  private evaluate(expression: Expression): Value {
    switch (expression.kind) {
      case 'literal':
        return expression.value;
      case 'identifier':
        return this.lookup(expression.name);
      case 'call':
        return this.callFunction(
          expression.name,
          expression.arguments.map((argument) => this.evaluate(argument))
        );
      case 'unary': {
        const value = this.evaluate(expression.operand);
        if (expression.operator === '!') return !this.asBoolean(value);
        return -this.asNumber(value);
      }
      case 'binary': {
        const left = this.evaluate(expression.left);
        if (expression.operator === '&&') {
          return this.asBoolean(left) && this.asBoolean(this.evaluate(expression.right));
        }
        if (expression.operator === '||') {
          return this.asBoolean(left) || this.asBoolean(this.evaluate(expression.right));
        }
        const right = this.evaluate(expression.right);
        switch (expression.operator) {
          case '+': return this.asNumber(left) + this.asNumber(right);
          case '-': return this.asNumber(left) - this.asNumber(right);
          case '*': return this.asNumber(left) * this.asNumber(right);
          case '/':
            if (this.asNumber(right) === 0) throw new Error('Division by zero');
            return this.asNumber(left) / this.asNumber(right);
          case '%':
            if (this.asNumber(right) === 0) throw new Error('Division by zero');
            return this.asNumber(left) % this.asNumber(right);
          case '<': return this.asNumber(left) < this.asNumber(right);
          case '>': return this.asNumber(left) > this.asNumber(right);
          case '<=': return this.asNumber(left) <= this.asNumber(right);
          case '>=': return this.asNumber(left) >= this.asNumber(right);
          case '==': return left === right;
          case '!=': return left !== right;
          default: throw new Error(`Unsupported operator '${expression.operator}'`);
        }
      }
    }
  }

  private lookup(name: string): Value {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      if (this.scopes[index].has(name)) return this.scopes[index].get(name);
    }
    throw new Error(`Undefined variable '${name}' during execution`);
  }

  private assign(name: string, value: Value): void {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      if (this.scopes[index].has(name)) {
        this.scopes[index].set(name, value);
        return;
      }
    }
    throw new Error(`Undefined variable '${name}' during execution`);
  }

  private asNumber(value: Value): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Expected a numeric value during execution');
    }
    return value;
  }

  private asBoolean(value: Value): boolean {
    if (typeof value !== 'boolean') {
      throw new Error('Expected a boolean value during execution');
    }
    return value;
  }
}

export interface ExecutionResult {
  ok: boolean;
  value: string;
  error?: string;
}

export function runProgram(source: string): ExecutionResult {
  try {
    const parser = new SourceParser(source);
    parser.parseProgram();
    const result = new ProgramRunner(parser.functions).run();
    return {
      ok: true,
      value: result === undefined ? 'Program finished without a return value.' : String(result),
    };
  } catch (error: unknown) {
    return {
      ok: false,
      value: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function tokenize(source: string): Token[] {
  const cleaned = source.replace(/\/\/[^\n]*/g, '');
  const tokens: Token[] = [];
  const matcher = /\s+|(?:\d+(?:\.\d+)?)|(?:[A-Za-z_]\w*)|(?:==|!=|<=|>=|&&|\|\|)|[{}(),;+\-*/%<>=!]/gy;
  let offset = 0;
  while (offset < cleaned.length) {
    matcher.lastIndex = offset;
    const match = matcher.exec(cleaned);
    if (!match) {
      throw new Error(`Unsupported source character '${cleaned[offset]}'`);
    }
    offset = matcher.lastIndex;
    if (!/^\s+$/.test(match[0])) tokens.push({ value: match[0] });
  }
  return tokens;
}
