import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';

interface StatusBarProps {
  compileStatus: 'idle' | 'success' | 'error';
  errorCount: number;
  timeTakenMs: number | null;
  cursorPos: { line: number; col: number };
  tokenCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  compileStatus,
  errorCount,
  timeTakenMs,
  cursorPos,
  tokenCount,
}) => {
  return (
    <footer className="grid min-h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 bg-blue-600 px-2 py-1 font-mono text-[10px] leading-tight tracking-tight text-white select-none sm:flex sm:h-6 sm:min-h-0 sm:items-center sm:justify-between sm:px-3 sm:py-0 sm:text-[11px]">
      {/* Left items: Real compile status, duration, cursor position */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3">
        {compileStatus === 'idle' && (
          <div className="flex items-center gap-1.5 whitespace-nowrap opacity-90">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
            <span>Ready</span>
          </div>
        )}

        {compileStatus === 'success' && (
          <div className="flex items-center gap-1.5 whitespace-nowrap font-medium text-blue-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="sm:hidden">Succeeded</span>
            <span className="hidden sm:inline">Compilation Succeeded</span>
          </div>
        )}

        {compileStatus === 'error' && (
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded bg-rose-700 px-2 py-0.5 font-medium text-white">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
        )}

        {timeTakenMs !== null && (
          <div className="hidden items-center gap-1 whitespace-nowrap opacity-90 sm:flex">
            <Clock className="w-3 h-3" />
            <span>{timeTakenMs.toFixed(0)}ms</span>
          </div>
        )}

        <div className="flex items-center gap-1 whitespace-nowrap font-mono opacity-90">
          <Layers className="w-3 h-3" />
          <span>{tokenCount} tokens</span>
        </div>
      </div>

      {/* Right items: Cursor position & Language standard */}
      <div className="flex items-center justify-end gap-x-2 sm:gap-3">
        <div className="whitespace-nowrap font-mono opacity-90">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>

        <div className="hidden h-3 w-px bg-blue-400 opacity-60 sm:block" />

        <div className="hidden whitespace-nowrap opacity-90 sm:block">Custom C-like language</div>

        <div className="hidden h-3 w-px bg-blue-400 opacity-60 sm:block" />

        <div className="hidden whitespace-nowrap opacity-80 sm:block">UTF-8</div>
      </div>
    </footer>
  );
};
