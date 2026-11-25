import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'input:not([type=checkbox]):not([type=hidden]), textarea, select, button',
    );
    setTimeout(() => first?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  // Rendered at the end of <body>, so a dialog opened from the header does not inherit its styles.
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg" role="dialog" aria-modal="true" ref={ref}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({
  text,
  okText,
  danger,
  onOk,
  onClose,
}: {
  text: string;
  okText: string;
  danger?: boolean;
  onOk: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={text} onClose={onClose}>
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          ביטול
        </button>
        <button
          className={danger ? 'danger' : 'pri'}
          onClick={() => {
            onClose();
            onOk();
          }}
        >
          {okText}
        </button>
      </div>
    </Modal>
  );
}

/** Fallback when the clipboard API is blocked: show the text to copy by hand. */
export function CopyFallbackModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Modal title="העתקה ידנית" onClose={onClose}>
      <p className="small muted">ההעתקה האוטומטית לא זמינה כאן. סמנו והעתיקו:</p>
      <textarea rows={8} readOnly defaultValue={text} onFocus={(e) => e.currentTarget.select()} />
      <div className="row end">
        <button className="ghost" onClick={onClose}>
          סגירה
        </button>
      </div>
    </Modal>
  );
}
