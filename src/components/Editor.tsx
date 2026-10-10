import React, { useEffect, useRef } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { CompilerError, EditorTabFile } from '../types/compiler';
import {
  Code2,
  Plus,
  X,
  AlignLeft,
  Copy,
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';

interface EditorProps {
  files: EditorTabFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onCloseFile: (id: string) => void;
  onRenameFile: (id: string, name: string) => void;
  code: string;
  onChange: (value: string) => void;
  errors: CompilerError[];
  selectedLine?: number | null;
  onSelectLine?: (line: number) => void;
  onCursorChange?: (line: number, col: number) => void;
  onFormat: () => void;
  onResetSample: () => void;
  onNotify: (msg: string, type?: 'success' | 'info') => void;
}

export const Editor: React.FC<EditorProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onCloseFile,
  code,
  onChange,
  errors,
  selectedLine,
  onSelectLine,
  onCursorChange,
  onFormat,
  onResetSample,
  onNotify,
}) => {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [copied, setCopied] = React.useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
      if (onSelectLine) {
        onSelectLine(e.position.lineNumber);
      }
    });

    updateErrorMarkersAndDecorations();
  };

  const updateErrorMarkersAndDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Monaco squiggly underline markers
    const markers: MonacoEditorType.IMarkerData[] = errors.map((err) => {
      const line = Math.max(1, Math.min(err.line || 1, model.getLineCount()));
      const lineMaxCol = model.getLineMaxColumn(line);
      return {
        severity: monaco.MarkerSeverity.Error,
        message: `[${err.phase.toUpperCase()}] ${err.message}`,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: lineMaxCol,
      };
    });
    monaco.editor.setModelMarkers(model, 'compiler-diagnostics', markers);

    // Visual line highlight decorations for errors
    const newDecorations: MonacoEditorType.IModelDeltaDecoration[] = errors.map((err) => {
      const line = Math.max(1, Math.min(err.line || 1, model.getLineCount()));
      return {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'bg-rose-500/10 border-l-2 border-rose-500',
          glyphMarginClassName: 'bg-rose-600 rounded-full w-2 h-2 my-auto ml-1',
          hoverMessage: {
            value: `**${err.phase.toUpperCase()} ERROR**: ${err.message}`,
          },
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    updateErrorMarkersAndDecorations();
  }, [errors]);

  useEffect(() => {
    if (selectedLine && editorRef.current) {
      editorRef.current.revealLineInCenter(selectedLine);
      editorRef.current.setPosition({ lineNumber: selectedLine, column: 1 });
      editorRef.current.focus();
    }
  }, [selectedLine]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    onNotify('Source code copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleClearCode = () => {
    onChange('');
    onNotify('Editor buffer cleared', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* File Tabs Bar */}
      <div className="flex min-w-0 shrink-0 flex-col bg-slate-100/80 px-2 select-none sm:flex-row sm:items-center sm:justify-between sm:overflow-x-auto">
        <div className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto py-1">
          {files.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`group flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-t transition-colors cursor-pointer border-t border-x ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold border-slate-200 dark:border-slate-800 -mb-px'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{file.filename}</span>
                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={onAddFile}
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
            title="New File Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editor Quick Actions Toolbar */}
        <div className="flex shrink-0 items-center justify-end gap-1 border-t border-slate-200 py-1 text-xs text-slate-600 sm:justify-start sm:border-0 sm:py-0">
          <button
            onClick={onFormat}
            className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-slate-200/60 hover:text-slate-900 sm:py-0.5"
            title="Format Code (Alt+F)"
          >
            <AlignLeft className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Format</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-slate-200/60 hover:text-slate-900 sm:py-0.5"
            title="Copy Source"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleClearCode}
            className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-slate-200/60 hover:text-slate-900 sm:py-0.5"
            title="Clear Editor"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>

          <button
            onClick={onResetSample}
            className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-slate-200/60 hover:text-slate-900 sm:py-0.5"
            title="Reset to Starter Code"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Reset</span>
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 w-full overflow-hidden relative">
        <MonacoEditor
          height="100%"
          language="c"
          theme="vs"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            fontSize: 13,
            lineHeight: 21,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            bracketPairColorization: { enabled: true },
            wordWrap: 'on',
            renderLineHighlight: 'all',
          }}
        />
      </div>
    </div>
  );
};
