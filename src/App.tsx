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
import { LanguageReferenceDrawer } from './components/LanguageReferenceDrawer';
import { AboutModal } from './components/AboutModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ConsolePanel } from './components/ConsolePanel';
import { OutputPanel } from './components/OutputPanel';
import { LandingPage } from './components/LandingPage';
import { ToastContainer, ToastItem } from './components/Toast';
import { ModelInfoPanel } from './components/ModelInfoPanel';
import {
  API_BASE_CHANGED_EVENT,
  API_BASE_STORAGE_KEY,
  DEFAULT_API_BASE,
  SAMPLE_PROGRAMS,
  getApiBase,
} from './config';
import {
  checkBackendHealth,
  compileCode,
  explainError,
  adviseOptimization,
  fetchMLStatus,
} from './api';
import { ExecutionResult, runProgram } from './runtime';
import {
  CompileResponse,
  CompilerError,
  ExplainResponse,
  AdviseResponse,
  SampleProgram,
  EditorTabFile,
  ConsoleLogEntry,
  MLStatusResponse,
} from './types/compiler';
import {
  Layers,
  GitFork,
  Database,
  Binary,
  Zap,
  AlertTriangle,
  Terminal,
} from 'lucide-react';

type TabKey = 'output' | 'tokens' | 'ast' | 'symbols' | 'tac' | 'optimization' | 'errors';

const FILES_STORAGE_KEY = 'optilexis_session_files';
const ACTIVE_FILE_KEY = 'optilexis_session_active_file_id';
const SPLIT_WIDTH_KEY = 'optilexis_session_split_width';
const APP_VIEW_KEY = 'optilexis_session_app_view';
const STARTER_CODE = `// Online C compiler (editor)
// Write and run code online using this editor.

#include <stdio.h>

int main() {
    printf("Try clicking the Run button.");
    return 0;
}
`;

export default function App() {
  const [showLandingPage, setShowLandingPage] = useState(
    () => typeof window === 'undefined' || sessionStorage.getItem(APP_VIEW_KEY) !== 'workspace'
  );

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // File tabs are scoped to this browser tab and survive refreshes.
  const [files, setFiles] = useState<EditorTabFile[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(FILES_STORAGE_KEY);
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
        code: STARTER_CODE,
      },
    ];
  });

  const [activeFileId, setActiveFileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(ACTIVE_FILE_KEY);
      if (saved) return saved;
    }
    return 'file-main';
  });

  useEffect(() => {
    sessionStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    sessionStorage.setItem(ACTIVE_FILE_KEY, activeFileId);
  }, [activeFileId]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const code = activeFile ? activeFile.code : '';

  const setCode = (newCode: string) => {
    setCompileData(null);
    setExecutionResult(null);
    setCompileStatus('idle');
    setTimeTakenMs(null);
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, code: newCode } : f))
    );
  };

  // Sample Selection
  const [selectedSampleId, setSelectedSampleId] = useState('');

  // Active Output Tab
  const [activeTab, setActiveTab] = useState<TabKey>('tokens');

  // Compilation Results State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [timeTakenMs, setTimeTakenMs] = useState<number | null>(null);
  const [compileData, setCompileData] = useState<CompileResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Editor cursor & selection tracking
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  const [apiBaseUrl, setApiBaseUrl] = useState(getApiBase);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [mlStatus, setMLStatus] = useState<MLStatusResponse | null>(null);
  const [mlStatusLoading, setMLStatusLoading] = useState(false);
  const [mlStatusError, setMLStatusError] = useState<string | null>(null);
  const isMockMode = backendOnline !== true;

  useEffect(() => {
    const updateApiBase = (url: string) => {
      setApiBaseUrl(url.trim() || DEFAULT_API_BASE);
      setBackendOnline(null);
      setMLStatus(null);
      setMLStatusError(null);
    };
    const handleApiBaseChanged = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      updateApiBase(customEvent.detail || getApiBase());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === API_BASE_STORAGE_KEY) {
        updateApiBase(event.newValue || getApiBase());
      }
    };
    window.addEventListener(API_BASE_CHANGED_EVENT, handleApiBaseChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(API_BASE_CHANGED_EVENT, handleApiBaseChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    setBackendOnline(null);

    const checkConnection = async () => {
      const isOnline = await checkBackendHealth(apiBaseUrl);
      if (cancelled) return;
      setBackendOnline(isOnline);
      retryTimer = window.setTimeout(
        () => void checkConnection(),
        isOnline ? 30_000 : 5_000
      );
    };

    void checkConnection();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!backendOnline) {
      setMLStatus(null);
      setMLStatusError(null);
      setMLStatusLoading(false);
      return;
    }
    let cancelled = false;
    setMLStatusLoading(true);
    setMLStatusError(null);
    void fetchMLStatus(apiBaseUrl)
      .then((status) => {
        if (!cancelled) setMLStatus(status);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMLStatusError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setMLStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendOnline, apiBaseUrl]);

  // Modals & Drawers
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
  const lastToastRef = useRef<{ key: string; timestamp: number } | null>(null);

  // Resizable Split percentage
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SPLIT_WIDTH_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 25 && val <= 75) return val;
      }
    }
    return 40;
  });
  const isDraggingRef = useRef(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const key = `${type}:${message}`;
    const now = Date.now();
    if (lastToastRef.current?.key === key && now - lastToastRef.current.timestamp < 2200) {
      return;
    }
    lastToastRef.current = { key, timestamp: now };
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const addConsoleLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const id = `log-${Date.now()}-${Math.random()}`;
    setConsoleLogs((prev) => [...prev, { id, timestamp, level, message }]);
  }, []);

  const requestWithOfflineFallback = useCallback(async <T,>(
    request: (useMockMode: boolean) => Promise<T>
  ): Promise<T> => {
    if (backendOnline !== true) return request(true);
    try {
      return await request(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Backend not reachable')) throw error;
      setBackendOnline(false);
      setMLStatus(null);
      setMLStatusError(null);
      return request(true);
    }
  }, [backendOnline]);

  // Compile Handler
  const handleCompile = useCallback(async (sourceCode = code) => {
    setIsCompiling(true);
    setExecutionResult(null);
    const startTime = performance.now();
    const filename = activeFile ? activeFile.filename : 'main.c';

    addConsoleLog(`Build started: ${filename}`, 'info');

    try {
      const result = await requestWithOfflineFallback((mockMode) =>
        compileCode(sourceCode, mockMode, apiBaseUrl)
      );
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
        setExecutionResult(null);
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
        const programResult = runProgram(sourceCode);
        setExecutionResult(programResult);
        setActiveTab('output');
        addConsoleLog(`Compilation succeeded in ${elapsed.toFixed(0)}ms (0 errors)`, 'success');
        addConsoleLog(
          programResult.ok
            ? `Program returned: ${programResult.value}`
            : `Program execution stopped: ${programResult.value}`,
          programResult.ok ? 'success' : 'warn'
        );
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
  }, [code, isMockMode, apiBaseUrl, activeFile, addConsoleLog, addToast, requestWithOfflineFallback]);

  // Explain with AI button action
  const handleExplainGlobal = useCallback(async () => {
    const currentErrors = compileData?.errors || [];

    if (currentErrors.length > 0) {
      // Has errors -> call POST /explain on first error
      const targetError = currentErrors[0];
      setModalError(targetError);
      setExplainModalOpen(true);
      setIsExplaining(true);
      try {
        const res = await requestWithOfflineFallback((mockMode) =>
          explainError({ code, error: targetError }, mockMode, apiBaseUrl)
        );
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
        const res = await requestWithOfflineFallback((mockMode) =>
          adviseOptimization(
            {
              code,
              tac: compileData?.tac || [],
              optimized_tac: compileData?.optimized_tac || [],
            },
            mockMode,
            apiBaseUrl
          )
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
  }, [compileData, code, requestWithOfflineFallback, apiBaseUrl, addToast, addConsoleLog]);

  // Explain single error from errors panel
  const handleExplainSingleError = async (error: CompilerError): Promise<ExplainResponse> => {
    return requestWithOfflineFallback((mockMode) =>
      explainError({ code, error }, mockMode, apiBaseUrl)
    );
  };

  // Apply fix from AI (replaces editor code with fixed_code only)
  const handleApplyFix = (fixedCode: string) => {
    setCode(fixedCode);
    addToast('Fix applied; recompiling source', 'success');
    addConsoleLog('Applied automated AI fix and started a fresh compile', 'info');
    void handleCompile(fixedCode);
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

  // Keyboard Shortcuts: Ctrl+Enter (compile), Ctrl+Shift+E (explain)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompile();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        void handleExplainGlobal();
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
  }, [handleCompile, handleExplainGlobal]);

  // Tab management
  const handleAddFile = () => {
    const newIndex = files.length + 1;
    const newFile: EditorTabFile = {
      id: `file-${Date.now()}`,
      filename: `test${newIndex}.c`,
      code: `#include <stdio.h>\n\nint main() {\n}\n`,
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
    setSelectedSampleId(sample.id);
    setCode(sample.code);
    setSelectedLine(null);
    addToast(`Loaded sample: ${sample.name}`, 'info');
    addConsoleLog(`Loaded sample program: ${sample.name}`, 'info');
  };

  const handleResetToStarter = () => {
    setSelectedSampleId('');
    setCode(STARTER_CODE);
    setSelectedLine(null);
    addToast('Restored starter code', 'info');
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
      sessionStorage.setItem(SPLIT_WIDTH_KEY, String(leftWidthPercent));
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
  const handleOpenCompiler = useCallback(() => {
    sessionStorage.setItem(APP_VIEW_KEY, 'workspace');
    setShowLandingPage(false);
    setActiveTab('output');
  }, []);

  if (showLandingPage) {
    return <LandingPage onEnter={handleOpenCompiler} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-slate-800 md:w-screen">
      <Header
        onCompile={() => void handleCompile()}
        isCompiling={isCompiling}
        onSelectSample={handleSelectSample}
        selectedSampleId={selectedSampleId}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenReference={() => setReferenceOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:px-4">
        <div
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-tight ${
            backendOnline
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
          }`}
          title={
            backendOnline === false
              ? apiBaseUrl
                ? `Backend health check failed at ${apiBaseUrl}.`
                : 'Set VITE_API_BASE_URL in Vercel to your deployed FastAPI backend URL.'
              : undefined
          }
          role="status"
          aria-live="polite"
        >
          {backendOnline === null
            ? 'Connecting to compiler backend...'
            : backendOnline
            ? 'Backend: Python PLY compiler + ML (connected)'
            : apiBaseUrl
              ? 'Offline mode: backend unavailable; using in-browser compiler'
              : 'Backend URL not configured; using in-browser compiler'}
        </div>
        <ModelInfoPanel
          status={mlStatus}
          isLoading={mlStatusLoading}
          error={mlStatusError}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:flex-row md:overflow-hidden">
        <div
          style={{ width: `${leftWidthPercent}%` }}
          className="editor-pane flex h-[34dvh] min-h-[240px] w-full shrink-0 flex-col md:h-full md:min-h-0 md:min-w-0 md:w-auto"
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
            onResetSample={handleResetToStarter}
            onNotify={addToast}
          />
        </div>

        <div
          onMouseDown={handleMouseDownResize}
          className="z-10 hidden w-1 shrink-0 cursor-col-resize select-none items-center justify-center bg-slate-200 transition-all hover:w-1.5 hover:bg-blue-500 md:flex"
          title="Drag to resize panels"
        />

        <div className="flex h-[34dvh] min-h-[250px] min-w-0 flex-none flex-col overflow-hidden bg-white md:h-full md:min-h-0 md:flex-1">
          {/* Tab Navigation */}
          <div className="shrink-0 select-none overflow-x-auto border-b border-slate-200 bg-slate-50 px-2">
            <div className="flex w-max items-center gap-1 py-1">
                {/* Tab: Program Output */}
                <button
                  onClick={() => setActiveTab('output')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'output'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Output</span>
                </button>

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
            {activeTab === 'output' && <OutputPanel result={executionResult} />}

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

      <ConsolePanel
        logs={consoleLogs}
        onClear={() => setConsoleLogs([])}
        isOpen={consoleOpen}
        onToggle={() => setConsoleOpen((prev) => !prev)}
      />

      <StatusBar
        compileStatus={compileStatus}
        errorCount={errors.length}
        timeTakenMs={timeTakenMs}
        cursorPos={cursorPos}
        tokenCount={tokens.length}
      />

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

      <LanguageReferenceDrawer
        isOpen={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        onLoadExample={(exCode) => {
          setCode(exCode);
          addToast('Loaded reference example into editor', 'info');
        }}
      />

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

      <ShortcutsModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
