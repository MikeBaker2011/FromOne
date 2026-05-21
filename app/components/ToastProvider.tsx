'use client';

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    return {
      showToast: ({ title, message }: Omit<Toast, 'id'>) => {
        window.alert(message ? `${title}\n\n${message}` : title);
      },
    };
  }

  return context;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        ...toast,
        id,
      },
    ]);

    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((currentToast) => currentToast.id !== id)
      );
    }, 4200);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 9999,
          display: 'grid',
          gap: 12,
          width: 'min(420px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              padding: 16,
              borderRadius: 20,
              background:
                'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))',
              border:
                toast.type === 'success'
                  ? '1px solid rgba(61, 220, 151, 0.34)'
                  : toast.type === 'error'
                    ? '1px solid rgba(255, 95, 109, 0.38)'
                    : toast.type === 'warning'
                      ? '1px solid rgba(255, 212, 59, 0.34)'
                      : '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 22px 70px rgba(0,0,0,0.34)',
              color: '#f8fafc',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  marginTop: 5,
                  flex: '0 0 auto',
                  background:
                    toast.type === 'success'
                      ? '#3ddc97'
                      : toast.type === 'error'
                        ? '#ff5f6d'
                        : toast.type === 'warning'
                          ? '#ffd43b'
                          : '#93c5fd',
                  boxShadow:
                    toast.type === 'success'
                      ? '0 0 18px rgba(61, 220, 151, 0.42)'
                      : toast.type === 'error'
                        ? '0 0 18px rgba(255, 95, 109, 0.42)'
                        : toast.type === 'warning'
                          ? '0 0 18px rgba(255, 212, 59, 0.42)'
                          : '0 0 18px rgba(147, 197, 253, 0.42)',
                }}
              />

              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: 15,
                    lineHeight: 1.25,
                    marginBottom: toast.message ? 5 : 0,
                  }}
                >
                  {toast.title}
                </strong>

                {toast.message && (
                  <p
                    style={{
                      margin: 0,
                      color: 'rgba(248,250,252,0.72)',
                      fontSize: 14,
                      lineHeight: 1.4,
                    }}
                  >
                    {toast.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}