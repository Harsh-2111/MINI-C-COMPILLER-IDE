import React from 'react';

interface AdvisoryMetadataProps {
  source?: 'gemini+ml' | 'ml' | 'rule-based';
  category?: string | null;
  confidence?: number | null;
}

const SOURCE_LABELS = {
  'gemini+ml': 'ML + Gemini',
  ml: 'ML model',
  'rule-based': 'Rule-based (offline)',
} as const;

export const AdvisoryMetadata: React.FC<AdvisoryMetadataProps> = ({
  source = 'rule-based',
  category,
  confidence,
}) => {
  const confidencePercent = Number.isFinite(confidence)
    ? Math.max(0, Math.min(100, Math.round((confidence ?? 0) * 100)))
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Advice source
        </span>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
          {SOURCE_LABELS[source]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500">ML category</span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {category || 'Unavailable'}
        </span>
        <span className="ml-auto text-[10px] font-medium text-slate-600 dark:text-slate-400">
          Confidence: {confidencePercent === null ? 'Unavailable' : `${confidencePercent}%`}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="ML prediction confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={confidencePercent ?? 0}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-[width]"
          style={{ width: `${confidencePercent ?? 0}%` }}
        />
      </div>
    </section>
  );
};
