import React, { useEffect, useState } from 'react';
import { useToastStore } from '@/store/toast-store';

const TOAST_ICONS: Record<string, { icon: string; color: string }> = {
  success: { icon: '✓', color: 'text-safe-green' },
  warning: { icon: '⚠', color: 'text-warning-amber' },
  error: { icon: '✗', color: 'text-risk-red' },
  info: { icon: 'ℹ', color: 'text-blue-400' },
};

const ToastItem: React.FC<{ id: string; type: 'success' | 'warning' | 'error' | 'info'; message: string; duration?: number }> = ({ id, type, message, duration = 5000 }) => {
  const removeToast = useToastStore((s) => s.removeToast);
  const { icon, color } = TOAST_ICONS[type];
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  const progressColor =
    type === 'success' ? 'bg-safe-green' :
    type === 'warning' ? 'bg-warning-amber' :
    type === 'error' ? 'bg-risk-red' :
    'bg-blue-400';

  return (
    <div className="flex items-start gap-3 bg-graphite border border-forged-steel/30 rounded-lg px-4 py-3 shadow-lg min-w-[300px] max-w-[420px] animate-slide-in-right relative overflow-hidden">
      <span className={`text-sm font-bold ${color} shrink-0 mt-0.5`}>{icon}</span>
      <span className="text-sm text-bright-steel flex-1 break-words">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="text-forged-steel hover:text-bright-steel transition-colors shrink-0 text-xs"
      >
        ✕
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-forge-black">
        <div
          className={`h-full ${progressColor} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} type={toast.type} message={toast.message} duration={toast.duration} />
      ))}
    </div>
  );
};
