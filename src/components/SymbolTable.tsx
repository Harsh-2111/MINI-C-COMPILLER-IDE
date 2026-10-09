import React, { useState } from 'react';
import { SymbolEntry } from '../types/compiler';
import { Database, Search } from 'lucide-react';

interface SymbolTableProps {
  symbols: SymbolEntry[];
  onSelectLine?: (line: number) => void;
  isLoading?: boolean;
}

export const SymbolTable: React.FC<SymbolTableProps> = ({
  symbols,
  onSelectLine,
  isLoading,
}) => {
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (isLoading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (!symbols || symbols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Database className="w-8 h-8 mb-2 stroke-[1.5]" />
        <p className="text-xs">Compile code to inspect symbol table</p>
      </div>
    );
  }

  const scopes = ['all', ...Array.from(new Set(symbols.map((s) => s.scope)))];

  const filteredSymbols = symbols.filter((s) => {
    const matchesScope = selectedScope === 'all' || s.scope === selectedScope;
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesScope && matchesSearch;
  });

  const getScopeBadge = (scope: string) => {
    switch (scope.toLowerCase()) {
      case 'global':
        return 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900';
      case 'main()':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900';
      default:
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Top Filter Bar */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {scopes.map((scope) => (
              <button
                key={scope}
                onClick={() => setSelectedScope(scope)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border capitalize ${
                  selectedScope === scope
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          {filteredSymbols.length} entries
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold sticky top-0 z-10">
              <th className="py-2 px-3 font-mono">Name</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Scope</th>
              <th className="py-2 px-3 font-mono">Offset</th>
              <th className="py-2 px-3">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
            {filteredSymbols.map((item, index) => (
              <tr
                key={`${item.name}-${item.scope}-${index}`}
                onClick={() => onSelectLine && onSelectLine(item.line)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="py-2 px-3 font-semibold text-blue-600 dark:text-blue-400">
                  {item.name}
                </td>
                <td className="py-2 px-3">
                  <span className="text-teal-700 dark:text-teal-400 font-medium">{item.type}</span>
                </td>
                <td className="py-2 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10.5px] border ${getScopeBadge(item.scope)}`}>
                    {item.scope}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-500 font-mono">+{item.offset}B</td>
                <td className="py-2 px-3 text-slate-500">L{item.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
