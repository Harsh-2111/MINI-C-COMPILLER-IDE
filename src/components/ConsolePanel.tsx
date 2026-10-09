import React, { useState, useRef, useEffect } from 'react';
import { ConsoleLogEntry } from '../types/compiler';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Filter,
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
        return 'text-rose-400 bg-rose-950/40 border-rose-900/60';
      case 'warn':
        return 'text-amber-300 bg-amber-950/40 border-amber-900/60';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60';
      default:
        return 'text-slate-300 bg-slate-900 border-slate-800';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  const errorCount = logs.filter((l) => l.level === 'error').length;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono select-none flex flex-col transition-all">
      {/* Console Header Bar */}
      <div className="h-8 px-3 flex items-center justify-between bg-slate-900 border-b border-slate-800">
        <div
          onClick={onToggle}
          className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors py-1"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">Console</span>
          {errorCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-sans">({logs.length} entries)</span>
          )}
        </div>

        {isOpen && (
          <div className="flex items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 font-sans text-[11px]">
              {['all', 'error', 'success', 'info'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-0.5 rounded transition-colors capitalize ${
                    filterLevel === lvl
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="w-px h-3.5 bg-slate-800" />

            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              title="Clear Console"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Log Output Body */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="h-36 overflow-y-auto p-2.5 space-y-1 bg-slate-950 font-mono text-[11.5px]"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 italic py-2 px-1">
              Console is empty. Build pipeline messages will appear here.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 leading-relaxed px-1.5 py-0.5 rounded hover:bg-slate-900/50"
              >
                <span className="text-slate-600 select-none text-[10.5px] shrink-0 font-mono">
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
