import React, { useState } from 'react';
import { ExplainResponse, CompilerError } from '../types/compiler';
import {
  Sparkles,
  X,
  Wrench,
  Check,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { AdvisoryMetadata } from './AdvisoryMetadata';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: ExplainResponse | null;
  error?: CompilerError | null;
  onApplyFix: (fixedCode: string) => void;
  isLoading: boolean;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  isOpen,
  onClose,
  explanation,
  error,
  onApplyFix,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (explanation?.fixed_code) {
      navigator.clipboard.writeText(explanation.fixed_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleApply = () => {
    if (explanation?.fix_verified && explanation.fixed_code) {
      onApplyFix(explanation.fixed_code);
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                AI Diagnostic &amp; Fix
              </h3>
              <p className="text-[11px] text-slate-500">
                Compiler error explanation and grammar-compliant code fix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Diagnosing error with AI...
              </p>
            </div>
          ) : explanation ? (
            <>
              <AdvisoryMetadata
                source={explanation.source}
                category={explanation.ml_category}
                confidence={explanation.ml_confidence}
              />
              {explanation.fix_verified !== true &&
                (explanation.remaining_errors ?? 0) > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    No safe code change was verified, so the source has not been changed.
                  </p>
                )}
              {explanation.fix_verified === true &&
                (explanation.remaining_errors ?? 0) > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    This verified fix resolves some diagnostics;{' '}
                    {explanation.remaining_errors} remain after applying it.
                  </p>
                )}
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 rounded-lg flex items-start gap-2 text-rose-900 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold uppercase text-[10px] bg-rose-200/60 dark:bg-rose-900/60 px-1 py-0.2 rounded mr-1.5">
                      {error.phase} · Line {error.line}
                    </span>
                    <span className="font-semibold">{error.message}</span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11.5px]">
                  Explanation
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {explanation.explanation}
                </p>
              </div>

              {/* Fix recommendation */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 space-y-1">
                <span className="font-semibold text-blue-900 dark:text-blue-300 block text-[11.5px]">
                  Suggested Fix
                </span>
                <p className="text-blue-800 dark:text-blue-400 font-medium leading-relaxed">
                  {explanation.fix}
                </p>
              </div>

              {/* Code preview */}
              {explanation.fixed_code && explanation.fix_verified && (
                <div>
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Fixed Code Preview
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed border border-slate-800">
                    {explanation.fixed_code}
                  </pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            Close
          </button>

          {explanation?.fixed_code && explanation.fix_verified && (
            <button
              onClick={handleApply}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                applied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {applied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Applied</span>
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Apply Fix to Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
