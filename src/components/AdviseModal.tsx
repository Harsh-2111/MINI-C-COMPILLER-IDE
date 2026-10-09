import React from 'react';
import { AdviseResponse } from '../types/compiler';
import { Sparkles, X, CheckCircle2, ArrowRight, Lightbulb } from 'lucide-react';

interface AdviseModalProps {
  isOpen: boolean;
  onClose: () => void;
  advice: AdviseResponse | null;
  isLoading: boolean;
  onSelectLine?: (line: number) => void;
}

export const AdviseModal: React.FC<AdviseModalProps> = ({
  isOpen,
  onClose,
  advice,
  isLoading,
  onSelectLine,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Optimization Advisor
              </h3>
              <p className="text-[11px] text-slate-500">
                Code verified clean (0 errors). Compiler optimization suggestions generated.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Analyzing intermediate representation and call graph...
              </p>
            </div>
          ) : advice && advice.suggestions.length > 0 ? (
            <div className="space-y-3">
              {advice.suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-[12.5px]">
                        {sug.title}
                      </span>
                    </div>
                    {sug.line && onSelectLine && (
                      <button
                        onClick={() => {
                          onSelectLine(sug.line!);
                          onClose();
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                      >
                        Line {sug.line}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                    {sug.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">
              No further optimizations suggested for the current intermediate representation.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
