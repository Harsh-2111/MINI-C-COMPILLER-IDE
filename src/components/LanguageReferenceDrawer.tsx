import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Code2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LanguageReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExample: (code: string) => void;
}

export const LanguageReferenceDrawer: React.FC<LanguageReferenceDrawerProps> = ({
  isOpen,
  onClose,
  onLoadExample,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLoad = (code: string) => {
    onLoadExample(code);
    onClose();
  };

  const examples = [
    {
      id: 'ex-accumulator',
      title: 'Accumulator Loop',
      desc: 'While-loop sum accumulator with comparison test.',
      code: `int main() {
    int sum = 0;
    int i = 1;
    while (i <= 10) {
        sum = sum + i;
        i = i + 1;
    }
    return sum;
}`,
    },
    {
      id: 'ex-functions',
      title: 'Function Call & Scopes',
      desc: 'User functions with arguments and local symbol activation.',
      code: `int max(int a, int b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

int main() {
    int x = 40;
    int y = 55;
    int result = max(x, y);
    return result;
}`,
    },
    {
      id: 'ex-bool-pred',
      title: 'Boolean Predicates',
      desc: 'Boolean evaluations and relational branch conditions.',
      code: `bool isValid(int val) {
    bool ok = (val >= 0);
    return ok;
}

int main() {
    int input = 12;
    bool status = isValid(input);
    return 0;
}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-xs text-slate-700 dark:text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Language Reference Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <h3 className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
              Compiler and assistance model
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              ML-assisted and LLM-assisted, with a rule-based compiler core. Machine learning and Gemini provide optional advice; deterministic compiler rules remain authoritative.
            </p>
          </section>

          {/* Supported Types */}
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[11px] text-blue-600">
              1. Supported Primitive Types
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono">
                <span className="font-bold text-blue-700 dark:text-blue-400">int</span>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">32-bit signed integer</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono">
                <span className="font-bold text-teal-700 dark:text-teal-400">float</span>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">Single-precision IEEE</p>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono">
                <span className="font-bold text-purple-700 dark:text-purple-400">bool</span>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">true / false boolean</p>
              </div>
            </div>
          </section>

          {/* Reserved Keywords */}
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[11px] text-blue-600">
              2. Reserved Grammar Keywords
            </h3>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px]">
              {['int', 'float', 'bool', 'void', 'if', 'else', 'while', 'return', 'true', 'false'].map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold"
                >
                  {kw}
                </span>
              ))}
            </div>
          </section>

          {/* Operator Precedence Table */}
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[11px] text-blue-600">
              3. Operator Precedence Hierarchy
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Precedence</th>
                    <th className="py-2 px-3 font-mono">Operators</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Associativity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">1 (Highest)</td>
                    <td className="py-1.5 px-3 font-bold text-rose-600">* / %</td>
                    <td className="py-1.5 px-3 font-sans">Multiplicative</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Left-to-Right</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">2</td>
                    <td className="py-1.5 px-3 font-bold text-rose-600">+ -</td>
                    <td className="py-1.5 px-3 font-sans">Additive</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Left-to-Right</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">3</td>
                    <td className="py-1.5 px-3 font-bold text-amber-600">&lt; &lt;= &gt; &gt;=</td>
                    <td className="py-1.5 px-3 font-sans">Relational</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Left-to-Right</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">4</td>
                    <td className="py-1.5 px-3 font-bold text-amber-600">== !=</td>
                    <td className="py-1.5 px-3 font-sans">Equality</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Left-to-Right</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">5</td>
                    <td className="py-1.5 px-3 font-bold text-purple-600">&amp;&amp; ||</td>
                    <td className="py-1.5 px-3 font-sans">Logical</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Left-to-Right</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-500">6 (Lowest)</td>
                    <td className="py-1.5 px-3 font-bold text-blue-600">=</td>
                    <td className="py-1.5 px-3 font-sans">Assignment</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500">Right-to-Left</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Function Declaration Syntax */}
          <section>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[11px] text-blue-600">
              4. Function Declaration Syntax
            </h3>
            <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] border border-slate-800 leading-relaxed">
{`type function_name(type param1, type param2) {
    // Local scope variable declarations
    type localVar = expr;
    // Statements & return
    return expr;
}`}
            </pre>
          </section>

          {/* 3 Copy-Into-Editor Examples */}
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-blue-600">
              5. Quick Copy Examples
            </h3>
            {examples.map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{ex.title}</h4>
                    <p className="text-[11px] text-slate-500">{ex.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(ex.id, ex.code)}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1 text-[11px] transition-colors"
                      title="Copy code"
                    >
                      {copiedId === ex.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleLoad(ex.code)}
                      className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <span>Load into Editor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <pre className="p-2.5 bg-slate-900 text-slate-200 rounded font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {ex.code}
                </pre>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};
