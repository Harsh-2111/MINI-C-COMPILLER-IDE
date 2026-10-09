import React from 'react';
import { HelpCircle, X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Enter / ⌘ + Enter', desc: 'Trigger compilation pipeline' },
    { key: 'Ctrl + Shift + E / ⌘ + Shift + E', desc: 'Run AI diagnostic or Optimization Advisor' },
    { key: 'Alt + F / ⌥ + F', desc: 'Format active C code' },
    { key: 'Ctrl + ` / ⌘ + `', desc: 'Toggle bottom Console log drawer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 text-sm">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span>Keyboard Shortcuts &amp; Help</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            {shortcuts.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
              >
                <span className="text-slate-600 dark:text-slate-300">{sc.desc}</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 shadow-2xs">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-[11.5px] leading-relaxed">
            <strong>Tip:</strong> In the Monaco editor, you can click on any error marker or hover over red squiggles to inspect phase details and error messages.
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
