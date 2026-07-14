import { useEffect } from 'react';
import { ToastContainer, showToast } from 'bora-frontend';

/**
 * ToastContainer hosts the app's transient notifications (fixed bottom pill).
 * It renders nothing until showToast() fires, so each preview triggers a
 * message on mount to show the pill's actual style.
 */
export function Notificacao() {
  useEffect(() => {
    showToast('Foto enviada pra turma! 📸');
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: 180 }}>
      <ToastContainer />
    </div>
  );
}

export function LinkCopiado() {
  useEffect(() => {
    showToast('Link copiado!');
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: 180 }}>
      <ToastContainer />
    </div>
  );
}
