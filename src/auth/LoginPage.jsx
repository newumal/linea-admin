import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { apiFetch, setStoredTokens } from '../api/client.js';
import { AUTH } from '../api/endpoints.js';
import { setUser } from '../store/authSlice.js';
import { loadGoogleIdentityServices } from './googleGsi.js';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const { user, bootstrapDone } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleErr, setGoogleErr] = useState('');
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!googleClientId) return undefined;
    const el = googleBtnRef.current;
    if (!el) return undefined;

    let cancelled = false;

    (async () => {
      setGoogleErr('');
      try {
        const idClient = await loadGoogleIdentityServices();
        if (cancelled) return;

        idClient.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (cancelled || !response?.credential) return;
            setGoogleErr('');
            try {
              const data = await apiFetch(AUTH.google, {
                method: 'POST',
                body: { idToken: response.credential },
              });
              setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
              dispatch(setUser(data.user));
              navigate(from, { replace: true });
            } catch (e) {
              if (e.status === 403) {
                setGoogleErr('Not authorized for admin.');
              } else {
                setGoogleErr(e.message || 'Google sign-in failed');
              }
            }
          },
        });

        el.innerHTML = '';
        await new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(r));
        });
        if (cancelled) return;

        const w = Math.floor(el.getBoundingClientRect().width) || 400;
        idClient.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, Math.max(250, w)),
        });
      } catch {
        if (!cancelled) setGoogleErr('Could not load Google Sign-In');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleClientId, dispatch, navigate, from]);

  if (bootstrapDone && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const data = await apiFetch(AUTH.login, {
        method: 'POST',
        body: { email, password },
      });
      setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      dispatch(setUser(data.user));
      navigate(from, { replace: true });
    } catch (e) {
      if (e.status === 403) {
        setErr('Not authorized for admin.');
      } else {
        setErr(e.message || 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          margin: 'auto',
          padding: 40,
        }}
      >
        <h1 className="admin-page-title" style={{ textAlign: 'center' }}>
          Linea Admin
        </h1>
        <p className="admin-page-sub" style={{ textAlign: 'center' }}>
          Sign in with your staff account.
        </p>

        <div style={{ marginBottom: 28 }}>
          {googleClientId ? (
            <>
              <div ref={googleBtnRef} style={{ width: '100%', minHeight: 48 }} />
              {googleErr ? <p className="admin-err">{googleErr}</p> : null}
            </>
          ) : (
            <p className="mono" style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center' }}>
              Set <code className="mono">VITE_GOOGLE_CLIENT_ID</code> for Google sign-in.
            </p>
          )}
        </div>

        <div className="divider-label" style={{ marginBottom: 20 }}>
          <span>or email</span>
        </div>

        <form onSubmit={onSubmit}>
          <label className="field-label" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: 16 }}
          />
          <label className="field-label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: 20 }}
          />
          {err ? <p className="admin-err">{err}</p> : null}
          <button type="submit" className="btn block" disabled={loading}>
            {loading ? '…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
