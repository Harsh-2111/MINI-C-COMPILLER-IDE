import React, { useState } from 'react';
import {
  Settings,
  X,
  Server,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_API_BASE, setApiBase } from '../config';
import { checkBackendHealth } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  onUpdateApiBase: (url: string) => void;
  isMockMode: boolean;
  onToggleMockMode: (val: boolean) => void;
  backendOnline: boolean | null;
  onRefreshBackendStatus: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiBase,
  onUpdateApiBase,
  isMockMode,
  onToggleMockMode,
  backendOnline,
  onRefreshBackendStatus,
}) => {
  const [localUrl, setLocalUrl] = useState(apiBase);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    onUpdateApiBase(localUrl);
    setApiBase(localUrl);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await checkBackendHealth(localUrl);
      if (ok) {
        setTestResult({ ok: true, message: `Successfully connected to ${localUrl}` });
      } else {
        setTestResult({
          ok: false,
          message: `Could not reach ${localUrl}. Ensure FastAPI server is listening.`,
        });
      }
      onRefreshBackendStatus();
    } catch {
      setTestResult({
        ok: false,
        message: `Connection failed to ${localUrl}.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetDefault = () => {
    setLocalUrl(DEFAULT_API_BASE);
    onUpdateApiBase(DEFAULT_API_BASE);
    setApiBase(DEFAULT_API_BASE);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 text-sm">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>Compiler Environment Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Mock Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Mock Compiler Engine</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Execute lexical scanning, AST layout, and TAC in-browser without a running server.
              </p>
            </div>
            <button
              onClick={() => onToggleMockMode(!isMockMode)}
              className="cursor-pointer ml-3 shrink-0"
              title="Toggle Mock Mode"
            >
              {isMockMode ? (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <span className="text-[11px]">ON</span>
                  <ToggleRight className="w-7 h-7 text-emerald-600" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                  <span className="text-[11px]">OFF</span>
                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                </span>
              )}
            </button>
          </div>

          {/* Backend API URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Backend API Base URL
              </label>
              <button
                onClick={handleResetDefault}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset default
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localUrl}
                onChange={(e) => {
                  setLocalUrl(e.target.value);
                  setTestResult(null);
                }}
                onBlur={handleSaveUrl}
                placeholder="http://localhost:8000"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3 py-1.5 font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {isTesting && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Test</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              FastAPI backend endpoints: POST /compile, POST /explain, POST /advise.
            </p>
          </div>

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div
              className={`p-2.5 rounded-md border flex items-start gap-2 ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Status summary */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Active Target:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {isMockMode ? 'In-Memory Mock' : localUrl}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={() => {
              handleSaveUrl();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
