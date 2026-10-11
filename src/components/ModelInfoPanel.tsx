import React from 'react';
import { MLStatusResponse } from '../types/compiler';

interface ModelInfoPanelProps {
  status: MLStatusResponse | null;
  isLoading: boolean;
  error: string | null;
}

function formatAccuracy(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : '—';
}

export const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({
  status,
  isLoading,
  error,
}) => (
  <details className="group relative">
    <summary className="cursor-pointer list-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      Model info
    </summary>
    <div className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Advisory model status</h3>
      {isLoading ? (
        <p className="mt-2 text-[11px] text-slate-500">Loading live model information…</p>
      ) : error ? (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">{error}</p>
      ) : status ? (
        <>
          <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            {status.loaded ? 'Models loaded' : status.load_error || 'Models unavailable'}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
            <dt className="text-slate-500">Error samples</dt>
            <dd className="text-right font-mono text-slate-700 dark:text-slate-300">
              {status.dataset_sizes.errors.toLocaleString()}
            </dd>
            <dt className="text-slate-500">Optimization samples</dt>
            <dd className="text-right font-mono text-slate-700 dark:text-slate-300">
              {status.dataset_sizes.optimization.toLocaleString()}
            </dd>
            <dt className="text-slate-500">Error classifier accuracy</dt>
            <dd className="text-right font-mono text-slate-700 dark:text-slate-300">
              {formatAccuracy(status.metrics.error_classifier_accuracy)}
            </dd>
            <dt className="text-slate-500">Optimization accuracy</dt>
            <dd className="text-right font-mono text-slate-700 dark:text-slate-300">
              {formatAccuracy(status.metrics.optimization_classifier_accuracy)}
            </dd>
            <dt className="text-slate-500">Reduction MAE</dt>
            <dd className="text-right font-mono text-slate-700 dark:text-slate-300">
              {typeof status.metrics.optimization_regressor_mae === 'number'
                ? status.metrics.optimization_regressor_mae.toFixed(2)
                : '—'}
            </dd>
          </dl>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">Connect the backend to load model information.</p>
      )}
    </div>
  </details>
);
