import React, { useState } from 'react';
import { SAMPLE_PROGRAMS } from '../config';
import { SampleProgram } from '../types/compiler';
import {
  Play,
  ChevronDown,
  HelpCircle,
  RefreshCw,
  Code2,
  BookOpen,
  Info,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onCompile: () => void;
  isCompiling: boolean;
  onSelectSample: (sample: SampleProgram) => void;
  selectedSampleId: string;
  isMockMode: boolean;
  backendOnline: boolean | null;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenReference: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCompile,
  isCompiling,
  onSelectSample,
  selectedSampleId,
  isMockMode,
  backendOnline,
  onOpenSettings,
  onOpenHelp,
  onOpenReference,
  onOpenAbout,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentSample = SAMPLE_PROGRAMS.find((s) => s.id === selectedSampleId);

  // Status dot determination
  const getStatusDot = () => {
    if (isMockMode) {
      return {
        color: 'bg-slate-400',
        tooltip: 'In-browser compiler active. Click to open compiler settings.',
      };
    }
    if (backendOnline === true) {
      return {
        color: 'bg-emerald-500',
        tooltip: 'Compiler backend connected. Click to open compiler settings.',
      };
    }
    return {
      color: 'bg-rose-500',
      tooltip: 'Compiler backend unreachable. Click to open compiler settings.',
    };
  };

  const statusDot = getStatusDot();

  return (
    <header className="relative z-20 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 select-none shadow-sm sm:px-4 md:flex md:min-h-16 md:flex-wrap md:items-center md:justify-between md:gap-x-2 md:gap-y-1 md:px-5 md:py-3 lg:min-h-[4.5rem]">
      {/* Left: Wordmark & Nav Links */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Logo and Wordmark */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-amber-200/30 bg-amber-100/10 shadow-sm sm:h-11 sm:w-11 md:h-12 md:w-12">
            <img src="/logo-icon.png" alt="" className="h-full w-full object-contain p-0.5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-bold leading-tight tracking-tight text-slate-900 sm:text-lg md:text-xl">
              OptiLexis AI
            </span>
            <span className="hidden text-[10px] leading-none text-slate-500 sm:block">
              Visual Compiler &amp; Mini-IDE
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Nav Links */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <button
            onClick={() => {}}
            className="rounded px-3 py-2 font-semibold text-blue-600 transition-colors hover:bg-blue-100"
          >
            Editor
          </button>
          <button
            onClick={onOpenReference}
            className="flex items-center gap-2 rounded px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <BookOpen className="h-4 w-4" />
            <span>Language Reference</span>
          </button>
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-2 rounded px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Info className="h-4 w-4" />
            <span>About</span>
          </button>
        </nav>
      </div>

      {/* Center: Compile & Run, Explain, Sample Select */}
      <div className="col-span-2 row-start-2 flex w-full min-w-0 items-center justify-between gap-2 md:col-span-1 md:row-auto md:w-auto md:flex-1 md:flex-wrap md:justify-end md:gap-2">
        {/* Sample Program dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:px-3"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="max-w-[min(62vw,220px)] truncate sm:max-w-[170px]">
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
              <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-xl">
                {SAMPLE_PROGRAMS.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => {
                      onSelectSample(prog);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full flex-col px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
                      prog.id === selectedSampleId
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-slate-700'
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
          className="flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 sm:px-3.5"
          title="Compile and run (Ctrl+Enter / ⌘+Enter)"
        >
          {isCompiling ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span className="hidden sm:inline">{isCompiling ? 'Compiling' : 'Compile & Run'}</span>
        </button>
      </div>

      <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 sm:gap-1.5 md:col-auto md:row-auto">
        <button
          onClick={onOpenSettings}
          className="flex h-9 w-7 items-center justify-center rounded transition-colors hover:bg-slate-100"
          title={statusDot.tooltip}
          aria-label={statusDot.tooltip}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot.color}`} />
        </button>

        <button
          onClick={onOpenHelp}
          className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title="Keyboard Shortcuts & Reference"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-1 rounded px-2 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Return to landing page"
          aria-label="Logout and return to landing page"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
