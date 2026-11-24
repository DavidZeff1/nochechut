import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastOptions {
  undo?: () => void;
  error?: boolean;
}
type ToastFn = (msg: string, opts?: ToastOptions) => void;

const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; opts: ToastOptions; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback<ToastFn>((msg, opts = {}) => {
    clearTimeout(timer.current);
    setT({ msg, opts, key: Date.now() });
    timer.current = setTimeout(() => setT(null), opts.undo ? 6000 : opts.error ? 5000 : 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={`toast ${t ? 'show' : ''} ${t?.opts.error ? 'err' : ''}`} role="status" aria-live="polite">
        {t && <span>{t.msg}</span>}
        {t?.opts.undo && (
          <button
            onClick={() => {
              t.opts.undo?.();
              setT(null);
            }}
          >
            ביטול
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Copy text; returns false when the clipboard is unavailable so the caller can show it instead. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
