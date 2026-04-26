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
import { HelpModal } from '../components/HelpModal.jsx';
import { ToastHost } from '../components/ToastHost.jsx';

const LS_SIDEBAR_PINNED = 'linea-admin-sidebar-pinned';
const LS_THEME = 'linea-admin-theme';
const LS_DENSITY = 'linea-admin-density';

export function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SIDEBAR_PINNED);
      if (raw == null) return true;
      return raw === '1' || raw === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_SIDEBAR_PINNED, sidebarPinned ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarPinned]);

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(LS_THEME) || 'light';
    } catch {
      return 'light';
    }
  });

  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem(LS_DENSITY) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    html.dataset.density = density === 'compact' ? 'compact' : 'comfortable';
    try {
      localStorage.setItem(LS_THEME, html.dataset.theme);
      localStorage.setItem(LS_DENSITY, html.dataset.density);
    } catch {
      /* ignore */
    }
  }, [theme, density]);

  const [loadingN, setLoadingN] = useState(0);
  useEffect(() => {
    const onLoad = (e) => setLoadingN(e.detail?.n ?? 0);
    window.addEventListener('admin:loading', onLoad);
    return () => window.removeEventListener('admin:loading', onLoad);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="screen admin-shell">
      {loadingN > 0 ? <div className="admin-loadingbar" /> : null}
      <Sidebar pinned={sidebarPinned} onTogglePinned={() => setSidebarPinned((v) => !v)} />
      <div className="admin-workspace">
        <Topbar
          onOpenAi={() => setAiOpen(true)}
          onOpenCommand={() => setCmdOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          theme={theme}
          density={density}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onToggleDensity={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
          onLogout={onLogout}
        />
        <main className="admin-main">
          <Outlet context={{ user }} />
        </main>
      </div>
      <AiDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ToastHost />
    </div>
  );
}
