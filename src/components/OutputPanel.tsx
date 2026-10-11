import React from 'react';
import { CircleAlert, CircleCheck, Terminal } from 'lucide-react';
import { ExecutionResult } from '../runtime';
import { CompilerError } from '../types/compiler';

interface OutputPanelProps {
  result: ExecutionResult | null;
  errors: CompilerError[];
  failure: string | null;
  isCompiling: boolean;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  result,
  errors,
  failure,
  isCompiling,
}) => (
  <div className="flex h-full flex-col overflow-y-auto bg-slate-950 font-mono text-sm text-slate-200">
    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
      <Terminal className="h-4 w-4 text-blue-400" />
      <span className="font-sans text-xs font-semibold text-slate-200">
        {errors.length > 0 || failure ? 'Build Result' : 'Program Output'}
      </span>
      {(result || errors.length > 0 || failure) && (
        <span
          className={`ml-auto flex items-center gap-1 text-[11px] ${
            result?.ok && errors.length === 0 && !failure ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {result?.ok && errors.length === 0 && !failure ? (
            <CircleCheck className="h-3.5 w-3.5" />
          ) : (
            <CircleAlert className="h-3.5 w-3.5" />
          )}
          {failure
            ? 'Build failed'
            : errors.length > 0
              ? `${errors.length} compilation diagnostic${errors.length === 1 ? '' : 's'}`
              : result?.ok
                ? 'Execution completed'
                : 'Execution stopped'}
        </span>
      )}
    </div>
    {isCompiling ? (
      <div className="flex flex-1 items-center justify-center p-6 text-center font-sans text-xs text-slate-400">
        Compiling C source...
      </div>
    ) : errors.length > 0 ? (
      <div className="space-y-3 p-4" role="alert">
        {errors.map((error, index) => (
          <div
            key={`${error.phase}-${error.line}-${index}`}
            className="rounded border border-rose-900/60 bg-rose-950/30 p-3"
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-300">
              {error.phase} · line {error.line}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-rose-200">
              {error.message}
            </p>
          </div>
        ))}
      </div>
    ) : failure ? (
      <div className="p-4" role="alert">
        <p className="whitespace-pre-wrap break-words text-sm text-rose-300">{failure}</p>
      </div>
    ) : result ? (
      <div className="p-4">
        <pre
          role="status"
          className={`whitespace-pre-wrap break-words text-lg ${
            result.ok ? 'font-semibold text-emerald-300' : 'text-rose-300'
          }`}
        >
          {result.ok && result.output ? result.output : result.value}
        </pre>
        {!result.ok && (
          <p className="mt-4 max-w-2xl font-sans text-xs leading-relaxed text-slate-500">
            Compilation passed, but the program could not finish running. Check the message above and use supported C features.
          </p>
        )}
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center p-6 text-center font-sans text-xs text-slate-500">
        Enter a supported C program, then select Compile &amp; Run to see its result here.
      </div>
    )}
  </div>
);
