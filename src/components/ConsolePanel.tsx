import React, { useState, useRef, useEffect } from 'react';
import { ConsoleLogEntry } from '../types/compiler';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface ConsolePanelProps {
  logs: ConsoleLogEntry[];
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  onClear,
  isOpen,
  onToggle,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'warn':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />;
    }
  };

  const errorCount = logs.filter((l) => l.level === 'error').length;

  return (
    <div className="flex flex-col border-t border-slate-200 bg-white font-mono text-xs text-slate-700 transition-all select-none">
      {/* Console Header Bar */}
      <div className="flex h-8 min-w-0 items-center justify-between gap-2 overflow-hidden border-b border-slate-200 bg-slate-100 px-3">
        <div
          onClick={onToggle}
          className="flex min-w-0 cursor-pointer items-center gap-2 py-1 transition-colors hover:text-slate-950"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          )}
          <Terminal className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800">Console</span>
          {errorCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          ) : (
            <span className="whitespace-nowrap font-sans text-[10px] text-slate-500">({logs.length} entries)</span>
          )}
        </div>

        {isOpen && (
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {/* Filter buttons */}
            <select
              aria-label="Filter console messages"
              value={filterLevel}
              onChange={(event) => setFilterLevel(event.target.value)}
              className="max-w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] capitalize text-slate-600 sm:hidden"
            >
              {['all', 'error', 'success', 'info'].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <div className="hidden items-center gap-1 font-sans text-[11px] sm:flex">
              {['all', 'error', 'success', 'info'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-0.5 rounded transition-colors capitalize ${
                    filterLevel === lvl
                      ? 'bg-blue-600 font-medium text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="hidden h-3.5 w-px bg-slate-300 sm:block" />

            <button
              onClick={onClear}
              className="flex items-center gap-1 rounded p-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 sm:p-0"
              title="Clear Console"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Log Output Body */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="h-20 space-y-1 overflow-y-auto bg-white p-2.5 font-mono text-[11.5px] sm:h-36"
        >
          {filteredLogs.length === 0 ? (
            <div className="px-1 py-2 italic text-slate-500">
              Console is empty. Build pipeline messages will appear here.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 rounded px-1.5 py-0.5 leading-relaxed hover:bg-slate-50"
              >
                <span className="shrink-0 font-mono text-[10.5px] text-slate-400 select-none">
                  [{log.timestamp}]
                </span>
                {getLevelIcon(log.level)}
                <span className={`flex-1 break-all ${getLevelStyle(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
