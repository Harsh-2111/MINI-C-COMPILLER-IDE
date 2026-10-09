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
  isMockMode: boolean;
  backendOnline: boolean | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  compileStatus,
  errorCount,
  timeTakenMs,
  cursorPos,
  tokenCount,
  isMockMode,
  backendOnline,
}) => {
  return (
    <footer className="h-6 bg-blue-600 dark:bg-blue-700 text-white px-3 flex items-center justify-between text-[11px] select-none font-mono tracking-tight shrink-0">
      {/* Left items: Real compile status, duration, cursor position */}
      <div className="flex items-center gap-3">
        {compileStatus === 'idle' && (
          <div className="flex items-center gap-1.5 opacity-90">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
            <span>Ready</span>
          </div>
        )}

        {compileStatus === 'success' && (
          <div className="flex items-center gap-1.5 font-medium text-blue-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Compilation Succeeded</span>
          </div>
        )}

        {compileStatus === 'error' && (
          <div className="flex items-center gap-1.5 font-medium bg-rose-700 px-2 py-0.5 rounded text-white">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          </div>
        )}

        {timeTakenMs !== null && (
          <div className="flex items-center gap-1 opacity-90">
            <Clock className="w-3 h-3" />
            <span>{timeTakenMs.toFixed(0)}ms</span>
          </div>
        )}

        <div className="flex items-center gap-1 opacity-90 font-mono">
          <Layers className="w-3 h-3" />
          <span>{tokenCount} tokens</span>
        </div>
      </div>

      {/* Right items: Cursor position & Language standard */}
      <div className="flex items-center gap-3">
        <div className="font-mono opacity-90">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>

        <div className="w-px h-3 bg-blue-400 opacity-60" />

        <div className="opacity-90">Custom C-like language</div>

        <div className="w-px h-3 bg-blue-400 opacity-60" />

        <div className="opacity-80">UTF-8</div>
      </div>
    </footer>
  );
};
