import React, { useMemo } from 'react';
import { Zap, ArrowRight } from 'lucide-react';

interface OptimizationDiffProps {
  tac: string[];
  optimizedTac: string[];
  isLoading?: boolean;
}

export const OptimizationDiff: React.FC<OptimizationDiffProps> = ({
  tac,
  optimizedTac,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-2 gap-4 h-full animate-pulse">
        <div className="bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (!tac || tac.length === 0 || !optimizedTac || optimizedTac.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Zap className="w-8 h-8 mb-2 stroke-[1.5]" />
        <p className="text-xs">Compile code to inspect optimization diff</p>
      </div>
    );
  }

  const countExecutable = (lines: string[]) =>
    lines.filter((l) => l.trim().length > 0 && !l.trim().startsWith('//')).length;

  const originalCount = countExecutable(tac);
  const optimizedCount = countExecutable(optimizedTac);
  const linesSaved = Math.max(0, originalCount - optimizedCount);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Summary Bar */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {linesSaved} instructions eliminated
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 font-mono text-[11px]">
            {originalCount} raw → {optimizedCount} optimized
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            Constant Folding
          </span>
          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            Dead Code Elimination
          </span>
        </div>
      </div>

      {/* Side-by-side Diff */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden text-xs font-mono">
        {/* Left: Original TAC */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/30 dark:bg-slate-950/30">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-sans font-medium text-slate-600 dark:text-slate-300 text-[11px]">
            Original TAC ({tac.length} lines)
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {tac.map((line, idx) => {
              const isComment = line.trim().startsWith('//');
              const isRemoved =
                !isComment &&
                !optimizedTac.some((opt) => opt.trim() === line.trim() || opt.includes(line.split('=')[0]));
              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded ${
                    isRemoved
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-l-2 border-rose-500'
                      : isComment
                      ? 'text-slate-400 italic'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="w-6 shrink-0 text-right pr-2 text-slate-400 select-none text-[10.5px]">
                    {idx + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">{line}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Optimized TAC */}
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/30 dark:bg-slate-950/30">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-sans font-medium text-slate-600 dark:text-slate-300 text-[11px]">
            Optimized Target TAC ({optimizedTac.length} lines)
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {optimizedTac.map((line, idx) => {
              const isComment = line.trim().startsWith('//');
              const isChanged =
                !isComment &&
                (line.includes('Folded') ||
                  line.includes('Propagated') ||
                  !tac.some((orig) => orig.trim() === line.trim()));
              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded ${
                    isChanged
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500'
                      : isComment
                      ? 'text-slate-400 italic'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="w-6 shrink-0 text-right pr-2 text-slate-400 select-none text-[10.5px]">
                    {idx + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
