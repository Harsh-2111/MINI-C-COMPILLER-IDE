import React from 'react';
import { CircleAlert, CircleCheck, Terminal } from 'lucide-react';
import { ExecutionResult } from '../runtime';

interface OutputPanelProps {
  result: ExecutionResult | null;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ result }) => (
  <div className="flex h-full flex-col bg-slate-950 font-mono text-sm text-slate-200">
    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
      <Terminal className="h-4 w-4 text-blue-400" />
      <span className="font-sans text-xs font-semibold text-slate-200">Program Output</span>
      {result && (
        <span
          className={`ml-auto flex items-center gap-1 text-[11px] ${
            result.ok ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {result.ok ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {result.ok ? 'Execution completed' : 'Execution stopped'}
        </span>
      )}
    </div>
    {result ? (
      <div className="p-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
          {result.ok ? 'Return value' : 'Runtime error'}
        </div>
        <pre
          role="status"
          className={`whitespace-pre-wrap break-words text-lg ${
            result.ok ? 'font-semibold text-emerald-300' : 'text-rose-300'
          }`}
        >
          {result.value}
        </pre>
        <p className="mt-4 max-w-2xl font-sans text-xs leading-relaxed text-slate-500">
          {result.ok
            ? 'This is the return value from running the program in CompileScope’s safe C-like interpreter.'
            : 'The source compiled, but execution could not complete. Check the message above and verify that the program uses supported language features.'}
        </p>
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center p-6 text-center font-sans text-xs text-slate-500">
        Compile &amp; Run a valid program to see its return value here.
      </div>
    )}
  </div>
);
