import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-900/90 text-white border-emerald-700';
      case 'error':
        return 'bg-rose-900/90 text-white border-rose-700';
      default:
        return 'bg-slate-900/90 text-white border-slate-700';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-300 shrink-0" />;
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg backdrop-blur-md text-xs transition-all animate-in slide-in-from-bottom-2 duration-150 ${getStyle()}`}
    >
      {getIcon()}
      <span className="flex-1 font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 text-white/70 hover:text-white rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
