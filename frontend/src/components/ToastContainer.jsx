import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function ToastContainer({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-dock">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`toast-item ${isSuccess ? 'toast-success' : isError ? 'toast-error' : 'toast-info'}`}
          >
            {isSuccess && <CheckCircle2 size={16} color="#34d399" />}
            {isError && <AlertTriangle size={16} color="#f87171" />}
            {!isSuccess && !isError && <Info size={16} color="var(--color-cyan)" />}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>{toast.title}</div>
              {toast.message && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {toast.message}
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
