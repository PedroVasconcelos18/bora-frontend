import { useEffect, useState } from 'react';

/**
 * Toast — fixed bottom notification following referencia.html #toast.
 * Background: var(--ink), color: var(--paper)
 * Animation: opacity 0→1 + translateY(20px→0) over 300ms
 * Auto-dismiss: 2800ms
 */

let globalShowToast: (message: string) => void = () => {};

export function showToast(message: string) {
  globalShowToast(message);
}

export function ToastContainer() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissTimer, setDismissTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    globalShowToast = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      if (dismissTimer) clearTimeout(dismissTimer);
      const t = setTimeout(() => setVisible(false), 2800);
      setDismissTimer(t);
    };

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 108,
        transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: '13px 20px',
        borderRadius: 14,
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: 'var(--shadow)',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.3s, transform 0.3s',
        zIndex: 60,
        maxWidth: '90%',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
      }}
    >
      {message}
    </div>
  );
}
