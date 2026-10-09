import React, { useState } from 'react';
import { Token } from '../types/compiler';
import { Layers, Search } from 'lucide-react';

interface TokensPanelProps {
  tokens: Token[];
  onSelectLine?: (line: number) => void;
  isLoading?: boolean;
}

export const TokensPanel: React.FC<TokensPanelProps> = ({
  tokens,
  onSelectLine,
  isLoading,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4 animate-pulse">
        <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Layers className="w-8 h-8 mb-2 stroke-[1.5]" />
        <p className="text-xs">Compile code to inspect tokens</p>
      </div>
    );
  }

  const getTokenStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'keyword':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case 'identifier':
        return 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900';
      case 'number':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'operator':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'string':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const typesCount = tokens.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueTypes = ['all', ...Object.keys(typesCount)];

  const filteredTokens = tokens.filter((t) => {
    const matchesType = filterType === 'all' || t.type.toLowerCase() === filterType.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      t.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Top Filter Bar */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          {uniqueTypes.map((type) => {
            const count = type === 'all' ? tokens.length : typesCount[type] || 0;
            const isActive = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border capitalize ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{type}</span>
                <span className="ml-1 opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tokens List */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex flex-wrap gap-1.5 content-start">
          {filteredTokens.map((token, index) => {
            const style = getTokenStyle(token.type);
            return (
              <div
                key={`${token.value}-${token.line}-${index}`}
                onClick={() => onSelectLine && onSelectLine(token.line)}
                title={`Type: ${token.type} | Value: "${token.value}" | Line: ${token.line} (Click to jump)`}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer font-mono ${style}`}
              >
                <span className="font-semibold">{token.value}</span>
                <span className="text-[10px] opacity-60">L{token.line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
