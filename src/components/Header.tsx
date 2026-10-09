import React, { useState } from 'react';
import { SAMPLE_PROGRAMS } from '../config';
import { SampleProgram } from '../types/compiler';
import {
  Play,
  Sparkles,
  ChevronDown,
  Cpu,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  RefreshCw,
  Code2,
  BookOpen,
  Info,
} from 'lucide-react';

interface HeaderProps {
  onCompile: () => void;
  onExplain: () => void;
  isCompiling: boolean;
  isExplaining: boolean;
  onSelectSample: (sample: SampleProgram) => void;
  selectedSampleId: string;
  isMockMode: boolean;
  backendOnline: boolean | null;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenReference: () => void;
  onOpenAbout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  hasErrors: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onCompile,
  onExplain,
  isCompiling,
  isExplaining,
  onSelectSample,
  selectedSampleId,
  isMockMode,
  backendOnline,
  onOpenSettings,
  onOpenHelp,
  onOpenReference,
  onOpenAbout,
  isDarkMode,
  onToggleTheme,
  hasErrors,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentSample = SAMPLE_PROGRAMS.find((s) => s.id === selectedSampleId);

  // Status dot determination
  const getStatusDot = () => {
    if (isMockMode) {
      return {
        color: 'bg-slate-400',
        tooltip: 'Mock Compiler Mode active (in-browser). Click to open Settings.',
      };
    }
    if (backendOnline === true) {
      return {
        color: 'bg-emerald-500',
        tooltip: 'Backend connected at API_BASE. Click to open Settings.',
      };
    }
    return {
      color: 'bg-rose-500',
      tooltip: 'Backend unreachable. Click to open Settings.',
    };
  };

  const statusDot = getStatusDot();

  return (
    <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left: Wordmark & Nav Links */}
      <div className="flex items-center gap-4">
        {/* Logo and Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-[13.5px] leading-tight tracking-tight">
              CompileScope
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
              Compiler Visualizer &amp; Mini-IDE
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <button
            onClick={() => {}}
            className="px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded transition-colors"
          >
            Editor
          </button>
          <button
            onClick={onOpenReference}
            className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Language Reference</span>
          </button>
          <button
            onClick={onOpenAbout}
            className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
        </nav>
      </div>

      {/* Center: Compile & Run, Explain, Sample Select */}
      <div className="flex items-center gap-2">
        {/* Sample Program dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="max-w-[130px] sm:max-w-[170px] truncate">
              {currentSample ? currentSample.name : 'Select Sample'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-40 text-xs">
                {SAMPLE_PROGRAMS.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => {
                      onSelectSample(prog);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex flex-col hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      prog.id === selectedSampleId
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{prog.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Compile and run the current program */}
        <button
          onClick={onCompile}
          disabled={isCompiling}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          title="Compile and run (Ctrl+Enter / ⌘+Enter)"
        >
          {isCompiling ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isCompiling ? 'Compiling' : 'Compile & Run'}</span>
        </button>

        {/* Explain with AI Button */}
        <button
          onClick={onExplain}
          disabled={isExplaining || isCompiling}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          title="Explain with AI (Ctrl+Shift+E / ⌘+Shift+E)"
        >
          {isExplaining ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          )}
          <span>{hasErrors ? 'Explain with AI' : 'Explain with AI'}</span>
        </button>
      </div>

      {/* Right: Status Dot, Theme Toggle, Settings, Help */}
      <div className="flex items-center gap-2">
        {/* Backend Status Dot */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={statusDot.tooltip}
        >
          <span className={`w-2 h-2 rounded-full ${statusDot.color}`} />
          <span className="hidden xl:inline text-[11px] font-mono">
            {isMockMode ? 'Mock' : backendOnline ? 'Connected' : 'Offline'}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings Dialog Trigger */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          title="Compiler Environment Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Help Dialog Trigger */}
        <button
          onClick={onOpenHelp}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          title="Keyboard Shortcuts & Reference"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
