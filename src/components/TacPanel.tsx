import React, { useState } from 'react';
import { Binary, Copy, Check } from 'lucide-react';

interface TacPanelProps {
  tac: string[];
  isLoading?: boolean;
}

export const TacPanel: React.FC<TacPanelProps> = ({ tac, isLoading }) => {
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2 bg-slate-950 h-full animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-800 rounded w-2/3" />
        ))}
      </div>
    );
  }

  if (!tac || tac.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Binary className="w-8 h-8 mb-2 stroke-[1.5]" />
        <p className="text-xs">Compile code to generate TAC</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(tac.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 font-sans">
        <span className="text-[11px] text-slate-400">
          {tac.length} instructions
        </span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Numbered instruction list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {tac.map((instruction, index) => {
          const isComment = instruction.trim().startsWith('//');
          const isLabel = instruction.trim().startsWith('label');
          return (
            <div
              key={index}
              className={`flex items-start px-1.5 py-0.5 rounded hover:bg-slate-900 ${
                isComment ? 'text-slate-500 italic' : isLabel ? 'text-amber-400 font-bold' : ''
              }`}
            >
              <span className="w-7 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px]">
                {isComment ? '' : index + 1}
              </span>
              <span className="flex-1 whitespace-pre leading-relaxed">{instruction}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
