import React, { useState } from 'react';
import { CompilerError, ExplainResponse } from '../types/compiler';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Check,
  RefreshCw,
  Wrench,
  FileCode2,
} from 'lucide-react';

interface ErrorsPanelProps {
  errors: CompilerError[];
  code: string;
  onSelectLine?: (line: number) => void;
  onApplyFix: (fixedCode: string) => void;
  onExplainError: (error: CompilerError) => Promise<ExplainResponse>;
  isLoading?: boolean;
}

export const ErrorsPanel: React.FC<ErrorsPanelProps> = ({
  errors,
  code,
  onSelectLine,
  onApplyFix,
  onExplainError,
  isLoading,
}) => {
  const [explainingIndex, setExplainingIndex] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Record<number, ExplainResponse>>({});
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const getPhaseBadge = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'lexical':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'syntax':
        return 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'semantic':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    }
  };

  const handleExplain = async (error: CompilerError, index: number) => {
    try {
      setExplainingIndex(index);
      const res = await onExplainError(error);
      setExplanations((prev) => ({ ...prev, [index]: res }));
    } catch (err) {
      console.error('Failed to explain error:', err);
    } finally {
      setExplainingIndex(null);
    }
  };

  const handleApply = (index: number, fixedCode: string) => {
    onApplyFix(fixedCode);
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2000);
  };

  const filteredErrors = errors.filter(
    (e) => filterPhase === 'all' || e.phase.toLowerCase() === filterPhase.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500 stroke-[1.5]" />
        <p className="text-xs text-slate-600 dark:text-slate-400">0 diagnostics: compilation clean</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Top Filter Bar */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {errors.length} {errors.length === 1 ? 'Diagnostic' : 'Diagnostics'}
        </span>

        <div className="flex items-center gap-1">
          {['all', 'lexical', 'syntax', 'semantic'].map((phase) => (
            <button
              key={phase}
              onClick={() => setFilterPhase(phase)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border capitalize ${
                filterPhase === phase
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Error List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredErrors.map((error, index) => {
          const explanationData = explanations[index];
          const isExplaining = explainingIndex === index;
          const isApplied = appliedIndex === index;

          return (
            <div
              key={index}
              className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border font-mono ${getPhaseBadge(
                      error.phase
                    )}`}
                  >
                    {error.phase}
                  </span>

                  <div>
                    <button
                      onClick={() => onSelectLine && onSelectLine(error.line)}
                      className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mr-1.5"
                    >
                      Line {error.line}:
                    </button>
                    <span className="text-xs text-slate-800 dark:text-slate-200">
                      {error.message}
                    </span>
                  </div>
                </div>

                {/* Explain with AI */}
                <button
                  onClick={() => handleExplain(error, index)}
                  disabled={isExplaining}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isExplaining ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Explain with AI</span>
                </button>
              </div>

              {/* Inline AI Explanation Card */}
              {explanationData && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Diagnosis</span>
                    </div>

                    <button
                      onClick={() => handleApply(index, explanationData.fixed_code)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                        isApplied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3 h-3" />
                          <span>Apply Fix to Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                    {explanationData.explanation}
                  </p>

                  <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
                    <div className="text-slate-700 dark:text-slate-300 font-sans font-medium">
                      Fix: {explanationData.fix}
                    </div>

                    {explanationData.fixed_code && (
                      <pre className="p-2 bg-slate-900 text-slate-200 rounded overflow-x-auto max-h-32 text-[10.5px]">
                        {explanationData.fixed_code}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
