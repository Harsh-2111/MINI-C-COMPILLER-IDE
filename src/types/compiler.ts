export interface Token {
  type: string;
  value: string;
  line: number;
}

export interface AstNode {
  type: string;
  label: string;
  line: number;
  children?: AstNode[];
}

export interface SymbolEntry {
  name: string;
  type: string;
  scope: string;
  offset: number;
  line: number;
}

export type ErrorPhase = 'lexical' | 'syntax' | 'semantic';

export interface CompilerError {
  phase: ErrorPhase;
  line: number;
  message: string;
}

export interface CompileResponse {
  tokens: Token[];
  ast: AstNode;
  symbols: SymbolEntry[];
  tac: string[];
  optimized_tac: string[];
  errors: CompilerError[];
}

export interface ExplainRequest {
  code: string;
  error: CompilerError;
}

export interface ExplainResponse {
  explanation: string;
  fix: string;
  fixed_code: string;
  fix_verified?: boolean;
  remaining_errors?: number;
  ml_category?: string | null;
  ml_confidence?: number | null;
  source?: 'gemini+ml' | 'ml' | 'rule-based';
}

export interface AdviseSuggestion {
  title: string;
  detail: string;
  line: number | null;
}

export interface AdviseRequest {
  code: string;
  tac: string[];
  optimized_tac: string[];
}

export interface AdviseResponse {
  suggestions: AdviseSuggestion[];
  ml_category?: string | null;
  ml_confidence?: number | null;
  ml_predicted_reduction?: number | null;
  actual_reduction?: number | null;
  source?: 'gemini+ml' | 'ml' | 'rule-based';
}

export interface MLStatusResponse {
  loaded: boolean;
  model_types: Record<string, string | null>;
  dataset_sizes: {
    errors: number;
    optimization: number;
  };
  metrics: Record<string, number>;
  load_error?: string | null;
}

export interface SampleProgram {
  id: string;
  name: string;
  category: 'valid' | 'syntax' | 'semantic' | 'lexical' | 'optimization';
  code: string;
  description: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface EditorTabFile {
  id: string;
  filename: string;
  code: string;
}
