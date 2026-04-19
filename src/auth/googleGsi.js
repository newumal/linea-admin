const GSI_SCRIPT_ID = 'linea-admin-google-gsi';

function waitForAccountsId(timeoutMs = 15000) {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const id = window.google?.accounts?.id;
      if (id) {
        resolve(id);
        return;
      }
      if (performance.now() - t0 >= timeoutMs) {
        reject(new Error('Google Sign-In unavailable'));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

let gsiReadyPromise = null;

/**
 * Injects the GIS script once (if needed) and resolves when `google.accounts.id` is usable.
 * StrictMode double-mount safe: concurrent callers share one promise; we never "resolve early"
 * just because the script tag already exists.
 */
export function loadGoogleIdentityServices() {
  if (!gsiReadyPromise) {
    gsiReadyPromise = (async () => {
      try {
        if (!document.getElementById(GSI_SCRIPT_ID)) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.id = GSI_SCRIPT_ID;
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true;
            s.defer = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
            document.head.appendChild(s);
          });
        }
        return await waitForAccountsId(15000);
      } catch (e) {
        gsiReadyPromise = null;
        throw e;
      }
    })();
  }
  return gsiReadyPromise;
}
