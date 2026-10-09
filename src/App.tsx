import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { Editor } from './components/Editor';
import { TokensPanel } from './components/TokensPanel';
import { AstGraph } from './components/AstGraph';
import { SymbolTable } from './components/SymbolTable';
import { TacPanel } from './components/TacPanel';
import { OptimizationDiff } from './components/OptimizationDiff';
import { ErrorsPanel } from './components/ErrorsPanel';
import { ExplainModal } from './components/ExplainModal';
import { AdviseModal } from './components/AdviseModal';
import { SettingsModal } from './components/SettingsModal';
import { LanguageReferenceDrawer } from './components/LanguageReferenceDrawer';
import { AboutModal } from './components/AboutModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ConsolePanel } from './components/ConsolePanel';
import { ToastContainer, ToastItem } from './components/Toast';
import { SAMPLE_PROGRAMS, getApiBase, setApiBase } from './config';
import { compileCode, explainError, adviseOptimization, checkBackendHealth } from './api';
import {
  CompileResponse,
  CompilerError,
  ExplainResponse,
  AdviseResponse,
  SampleProgram,
  EditorTabFile,
  ConsoleLogEntry,
} from './types/compiler';
import {
  Layers,
  GitFork,
  Database,
  Binary,
  Zap,
  AlertTriangle,
} from 'lucide-react';

type TabKey = 'tokens' | 'ast' | 'symbols' | 'tac' | 'optimization' | 'errors';

const FILES_STORAGE_KEY = 'compilescope_files';
const ACTIVE_FILE_KEY = 'compilescope_active_file_id';
const SPLIT_WIDTH_KEY = 'compilescope_split_width';
const THEME_STORAGE_KEY = 'compilescope_theme';
const MOCK_STORAGE_KEY = 'compilescope_mock_mode';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDarkMode]);

  // File Tabs state (persisted in localStorage)
  const [files, setFiles] = useState<EditorTabFile[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FILES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [
      {
        id: 'file-main',
        filename: 'main.c',
        code: SAMPLE_PROGRAMS[0].code,
      },
    ];
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_FILE_KEY);
      if (saved) return saved;
    }
    return 'file-main';
  });

  useEffect(() => {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
  }, [activeFileId]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const code = activeFile ? activeFile.code : '';

  const setCode = (newCode: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, code: newCode } : f))
    );
  };

  // Sample Selection
  const [selectedSample, setSelectedSample] = useState<SampleProgram>(SAMPLE_PROGRAMS[0]);

  // Active Output Tab
  const [activeTab, setActiveTab] = useState<TabKey>('tokens');

  // Compilation Results State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [timeTakenMs, setTimeTakenMs] = useState<number | null>(null);
  const [compileData, setCompileData] = useState<CompileResponse | null>(null);

  // Editor cursor & selection tracking
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // Mock Mode and Backend connection
  const [isMockMode, setIsMockMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MOCK_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBase());
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Modals & Drawers
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Explain / Advise Modals
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [modalExplanation, setModalExplanation] = useState<ExplainResponse | null>(null);
  const [modalError, setModalError] = useState<CompilerError | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [adviseModalOpen, setAdviseModalOpen] = useState(false);
  const [adviceData, setAdviceData] = useState<AdviseResponse | null>(null);
  const [isAdvising, setIsAdvising] = useState(false);

  // Console Logs
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Resizable Split percentage
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SPLIT_WIDTH_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 25 && val <= 75) return val;
      }
    }
    return 46;
  });
  const isDraggingRef = useRef(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const addConsoleLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const id = `log-${Date.now()}-${Math.random()}`;
    setConsoleLogs((prev) => [...prev, { id, timestamp, level, message }]);
  }, []);

  // Health check
  const refreshBackendStatus = useCallback(async () => {
    const online = await checkBackendHealth(apiBaseUrl);
    setBackendOnline(online);
  }, [apiBaseUrl]);

  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  // Initial compilation on mount
  useEffect(() => {
    handleCompile();
  }, []);

  // Persist mock mode
  const handleToggleMockMode = (val: boolean) => {
    setIsMockMode(val);
    localStorage.setItem(MOCK_STORAGE_KEY, String(val));
    addToast(val ? 'Switched to Mock Compiler Mode' : 'Switched to Live Backend API', 'info');
  };

  // Compile Handler
  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    const startTime = performance.now();
    const filename = activeFile ? activeFile.filename : 'main.c';

    addConsoleLog(`Build started: ${filename}`, 'info');

    try {
      const result = await compileCode(code, isMockMode, apiBaseUrl);
      const elapsed = performance.now() - startTime;
      setTimeTakenMs(elapsed);
      setCompileData(result);

      // Log pipeline progress
      if (result.tokens) {
        addConsoleLog(`Lexing complete: ${result.tokens.length} tokens`, 'info');
      }
      if (result.ast) {
        addConsoleLog(`Parsing complete: AST generated`, 'info');
      }
      if (result.symbols) {
        addConsoleLog(`Semantic analysis: ${result.symbols.length} symbols registered`, 'info');
      }
      if (result.tac) {
        addConsoleLog(`TAC generation: ${result.tac.length} instructions`, 'info');
      }

      if (result.errors && result.errors.length > 0) {
        setCompileStatus('error');
        result.errors.forEach((err) => {
          addConsoleLog(`Error [${err.phase.toUpperCase()}] Line ${err.line}: ${err.message}`, 'error');
        });
        addConsoleLog(`Compilation finished with ${result.errors.length} error(s) in ${elapsed.toFixed(0)}ms`, 'warn');
        addToast(`Compilation flagged ${result.errors.length} diagnostic error(s)`, 'error');
        // Switch to Errors tab on errors as requested
        setActiveTab('errors');
      } else {
        setCompileStatus('success');
        addConsoleLog(`Compilation succeeded in ${elapsed.toFixed(0)}ms (0 errors)`, 'success');
        addToast('Compilation succeeded (0 errors)', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompileStatus('error');
      addConsoleLog(`Build failure: ${msg}`, 'error');
      addToast(msg, 'error');
    } finally {
      setIsCompiling(false);
    }
  }, [code, isMockMode, apiBaseUrl, activeFile, addConsoleLog, addToast]);

  // Keyboard Shortcuts: Ctrl+Enter (compile), Ctrl+Shift+E (explain)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompile();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        handleExplainGlobal();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setConsoleOpen((prev) => !prev);
      } else if (e.altKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        handleFormatCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCompile]);

  // Explain with AI button action
  const handleExplainGlobal = async () => {
    const currentErrors = compileData?.errors || [];

    if (currentErrors.length > 0) {
      // Has errors -> call POST /explain on first error
      const targetError = currentErrors[0];
      setModalError(targetError);
      setExplainModalOpen(true);
      setIsExplaining(true);
      try {
        const res = await explainError({ code, error: targetError }, isMockMode, apiBaseUrl);
        setModalExplanation(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, 'error');
        addConsoleLog(`Explain error: ${msg}`, 'error');
      } finally {
        setIsExplaining(false);
      }
    } else {
      // NO errors -> call POST /advise (Requirement B.1)
      setAdviseModalOpen(true);
      setIsAdvising(true);
      try {
        const res = await adviseOptimization(
          {
            code,
            tac: compileData?.tac || [],
            optimized_tac: compileData?.optimized_tac || [],
          },
          isMockMode,
          apiBaseUrl
        );
        setAdviceData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addToast(msg, 'error');
        addConsoleLog(`Advisor error: ${msg}`, 'error');
      } finally {
        setIsAdvising(false);
      }
    }
  };

  // Explain single error from errors panel
  const handleExplainSingleError = async (error: CompilerError): Promise<ExplainResponse> => {
    return explainError({ code, error }, isMockMode, apiBaseUrl);
  };

  // Apply fix from AI (replaces editor code with fixed_code only)
  const handleApplyFix = (fixedCode: string) => {
    setCode(fixedCode);
    addToast('Fix applied to source editor', 'success');
    addConsoleLog('Applied automated AI syntax fix to editor', 'info');
    setTimeout(() => {
      handleCompile();
    }, 150);
  };

  // Code formatting utility
  const handleFormatCode = () => {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted = lines.map((l) => {
      let trimmed = l.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const indented = '    '.repeat(indentLevel) + trimmed;
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
      return indented;
    });
    setCode(formatted.join('\n'));
    addToast('Source code formatted', 'info');
  };

  // Tab management
  const handleAddFile = () => {
    const newIndex = files.length + 1;
    const newFile: EditorTabFile = {
      id: `file-${Date.now()}`,
      filename: `test${newIndex}.c`,
      code: `int compute() {\n    int a = 10;\n    int b = 20;\n    return a + b;\n}\n`,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    addToast(`Created ${newFile.filename}`, 'info');
  };

  const handleCloseFile = (id: string) => {
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    if (activeFileId === id) {
      setActiveFileId(remaining[0].id);
    }
  };

  const handleSelectSample = (sample: SampleProgram) => {
    setSelectedSample(sample);
    setCode(sample.code);
    setSelectedLine(null);
    addToast(`Loaded sample: ${sample.name}`, 'info');
    addConsoleLog(`Loaded sample program: ${sample.name}`, 'info');
    setTimeout(() => {
      handleCompile();
    }, 100);
  };

  const handleResetToSample = () => {
    setCode(selectedSample.code);
    addToast(`Reset code to sample: ${selectedSample.name}`, 'info');
  };

  // Resizable split handler
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const totalWidth = window.innerWidth;
      const newPercent = Math.max(25, Math.min(75, (moveEvent.clientX / totalWidth) * 100));
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      localStorage.setItem(SPLIT_WIDTH_KEY, String(leftWidthPercent));
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const errors = compileData?.errors || [];
  const tokens = compileData?.tokens || [];
  const ast = compileData?.ast || null;
  const symbols = compileData?.symbols || [];
  const tac = compileData?.tac || [];
  const optimizedTac = compileData?.optimized_tac || [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* 1. HEADER */}
      <Header
        onCompile={handleCompile}
        onExplain={handleExplainGlobal}
        isCompiling={isCompiling}
        isExplaining={isExplaining || isAdvising}
        onSelectSample={handleSelectSample}
        selectedSampleId={selectedSample.id}
        isMockMode={isMockMode}
        backendOnline={backendOnline}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenReference={() => setReferenceOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        hasErrors={errors.length > 0}
      />

      {/* 2. MAIN WORKSPACE (SPLIT VIEW) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT: Monaco Editor */}
        <div
          style={{ width: `${leftWidthPercent}%` }}
          className="h-1/2 md:h-full flex flex-col shrink-0 min-w-[300px] w-full md:w-auto"
        >
          <Editor
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            onAddFile={handleAddFile}
            onCloseFile={handleCloseFile}
            onRenameFile={() => {}}
            code={code}
            onChange={setCode}
            errors={errors}
            selectedLine={selectedLine}
            onSelectLine={setSelectedLine}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
            onFormat={handleFormatCode}
            onResetSample={handleResetToSample}
            isDarkMode={isDarkMode}
            onNotify={addToast}
          />
        </div>

        {/* Resizable Split Divider (Hidden on small screens) */}
        <div
          onMouseDown={handleMouseDownResize}
          className="hidden md:flex w-1 hover:w-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-blue-500 cursor-col-resize select-none transition-all items-center justify-center shrink-0 z-10"
          title="Drag to resize panels"
        />

        {/* RIGHT: Tabbed Compiler Output Panels */}
        <div className="flex-1 h-1/2 md:h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden min-w-[320px]">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 select-none overflow-x-auto shrink-0">
            <div className="flex items-center gap-1 py-1">
              {/* Tab: Tokens */}
              <button
                onClick={() => setActiveTab('tokens')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'tokens'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tokens</span>
                {tokens.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({tokens.length})
                  </span>
                )}
              </button>

              {/* Tab: AST */}
              <button
                onClick={() => setActiveTab('ast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'ast'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>AST</span>
              </button>

              {/* Tab: Symbol Table */}
              <button
                onClick={() => setActiveTab('symbols')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'symbols'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Symbol Table</span>
                {symbols.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({symbols.length})
                  </span>
                )}
              </button>

              {/* Tab: TAC */}
              <button
                onClick={() => setActiveTab('tac')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'tac'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>TAC</span>
                {tac.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({tac.length})
                  </span>
                )}
              </button>

              {/* Tab: Optimization */}
              <button
                onClick={() => setActiveTab('optimization')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'optimization'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Optimization</span>
              </button>

              {/* Tab: Errors & AI */}
              <button
                onClick={() => setActiveTab('errors')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'errors'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${errors.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                <span>Errors</span>
                {errors.length > 0 ? (
                  <span className="text-[10px] text-rose-600 font-mono font-bold">
                    ({errors.length})
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    (0)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'tokens' && (
              <TokensPanel tokens={tokens} onSelectLine={setSelectedLine} isLoading={isCompiling} />
            )}

            {activeTab === 'ast' && (
              <AstGraph ast={ast} onSelectLine={setSelectedLine} isLoading={isCompiling} />
            )}

            {activeTab === 'symbols' && (
              <SymbolTable symbols={symbols} onSelectLine={setSelectedLine} isLoading={isCompiling} />
            )}

            {activeTab === 'tac' && <TacPanel tac={tac} isLoading={isCompiling} />}

            {activeTab === 'optimization' && (
              <OptimizationDiff tac={tac} optimizedTac={optimizedTac} isLoading={isCompiling} />
            )}

            {activeTab === 'errors' && (
              <ErrorsPanel
                errors={errors}
                code={code}
                onSelectLine={setSelectedLine}
                onApplyFix={handleApplyFix}
                onExplainError={handleExplainSingleError}
                isLoading={isCompiling}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. COLLAPSIBLE CONSOLE PANEL */}
      <ConsolePanel
        logs={consoleLogs}
        onClear={() => setConsoleLogs([])}
        isOpen={consoleOpen}
        onToggle={() => setConsoleOpen((prev) => !prev)}
      />

      {/* 4. STATUS BAR */}
      <StatusBar
        compileStatus={compileStatus}
        errorCount={errors.length}
        timeTakenMs={timeTakenMs}
        cursorPos={cursorPos}
        tokenCount={tokens.length}
        isMockMode={isMockMode}
        backendOnline={backendOnline}
      />

      {/* 5. MODALS & DRAWERS */}
      <ExplainModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        explanation={modalExplanation}
        error={modalError}
        onApplyFix={handleApplyFix}
        isLoading={isExplaining}
      />

      <AdviseModal
        isOpen={adviseModalOpen}
        onClose={() => setAdviseModalOpen(false)}
        advice={adviceData}
        isLoading={isAdvising}
        onSelectLine={setSelectedLine}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiBase={apiBaseUrl}
        onUpdateApiBase={(url) => {
          setApiBaseUrl(url);
          setApiBase(url);
          refreshBackendStatus();
        }}
        isMockMode={isMockMode}
        onToggleMockMode={handleToggleMockMode}
        backendOnline={backendOnline}
        onRefreshBackendStatus={refreshBackendStatus}
      />

      <LanguageReferenceDrawer
        isOpen={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        onLoadExample={(exCode) => {
          setCode(exCode);
          addToast('Loaded reference example into editor', 'info');
          setTimeout(() => handleCompile(), 100);
        }}
      />

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

      <ShortcutsModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 6. TOAST NOTIFICATIONS */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
