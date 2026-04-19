import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { apiFetch, clearStoredTokens, getStoredTokens } from '../api/client.js';
import { AUTH } from '../api/endpoints.js';
import { clearAuth } from '../store/authSlice.js';
import { AiDrawer } from './AiDrawer.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { CommandPalette } from '../components/CommandPalette.jsx';

export function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const onLogout = useCallback(async () => {
    const { refreshToken } = getStoredTokens();
    try {
      if (refreshToken) {
        await apiFetch(AUTH.logout, { method: 'POST', body: { refreshToken }, auth: true });
      }
    } catch {
      /* still clear local session */
    }
    clearStoredTokens();
    dispatch(clearAuth());
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAiOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const user = useSelector((s) => s.auth.user);

  return (
    <div className="screen" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          onOpenAi={() => setAiOpen(true)}
          onOpenCommand={() => setCmdOpen(true)}
          onLogout={onLogout}
        />
        <main style={{ flex: 1, padding: 'var(--admin-content-pad)', overflow: 'auto' }}>
          <Outlet context={{ user }} />
        </main>
      </div>
      <AiDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
