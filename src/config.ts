import { SampleProgram } from './types/compiler';

// Default API base URL for FastAPI backend compiler service
export const DEFAULT_API_BASE = 'http://localhost:8000';

const API_BASE_STORAGE_KEY = 'compilescope_api_base';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_API_BASE;
}

export function setApiBase(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_BASE_STORAGE_KEY, url.trim());
  }
}

export const API_BASE = DEFAULT_API_BASE;

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'sample-fibonacci',
    name: 'Fibonacci Loop',
    category: 'valid',
    description: 'Iterative Fibonacci number calculation using a while loop and accumulator.',
    code: `int main() {
    int n = 8;
    int a = 0;
    int b = 1;
    int i = 2;
    int next = 0;

    while (i <= n) {
        next = a + b;
        a = b;
        b = next;
        i = i + 1;
    }

    return b;
}`,
  },
  {
    id: 'sample-function-params',
    name: 'Function with Parameters',
    category: 'valid',
    description: 'User-defined helper function call with typed arguments and return binding.',
    code: `int add(int a, int b) {
    return a + b;
}

int main() {
    int x = add(2, 3);
    return x;
}`,
  },
  {
    id: 'sample-bool-ifelse',
    name: 'Bool & If/Else Branches',
    category: 'valid',
    description: 'Boolean types, relational condition evaluation, and conditional branching.',
    code: `bool check(int val) {
    if (val > 10) {
        return true;
    } else {
        return false;
    }
}

int main() {
    int score = 15;
    bool ok = check(score);
    return 0;
}`,
  },
  {
    id: 'sample-optimization',
    name: 'Constant Folding & Dead Code',
    category: 'optimization',
    description: 'Arithmetic expressions folded at compile-time and unreachable branches pruned.',
    code: `int compute() {
    int x = 10 * 5 + 2;      // Folded: 52
    int y = 20;
    int z = x * 2;           // Propagated: 104
    int dead_var = 999;      // Dead assignment

    if (0 == 1) {            // Dead branch
        int dead_calc = 100 * 4;
        return dead_calc;
    }

    int result = z + y;
    return result;
}`,
  },
  {
    id: 'sample-syntax-error',
    name: 'Syntax Error (Missing Semicolon)',
    category: 'syntax',
    description: 'Grammar violation due to omitted terminating semicolon on line 3.',
    code: `int main() {
    int a = 10;
    int b = 25
    int c = a + b;
    return c;
}`,
  },
  {
    id: 'sample-semantic-error',
    name: 'Semantic Error (Type Mismatch & Undeclared)',
    category: 'semantic',
    description: 'Unresolved symbol reference and incompatible string assignment to integer.',
    code: `int main() {
    int count = 10;
    count = count + undeclared_var;
    int status = "incompatible_string";
    return count;
}`,
  },
  {
    id: 'sample-lexical-error',
    name: 'Lexical Error (Invalid Character)',
    category: 'lexical',
    description: 'Scanner rejection due to unrecognized token symbol @ in expression.',
    code: `int main() {
    int x = 42;
    int y = x @ 10;
    return y;
}`,
  },
];
