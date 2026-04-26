import { useEffect, useState } from 'react';
import { uiSubscribe } from '../lib/uiBus.js';

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return uiSubscribe((e) => {
      if (e?.type !== 'toast') return;
      const id = Math.random().toString(36).slice(2, 9);
      const msg = String(e.message || '').trim();
      if (!msg) return;
      setToasts((t) => [...t, { id, msg, tone: e.tone || 'info' }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 2200);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="admin-toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`admin-toast admin-toast--${t.tone}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

