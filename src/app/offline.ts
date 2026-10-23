/**
 * Registers the service worker (production build only) once the page has loaded and the browser is idle, then asks it
 * to precache the heavier files. Failures are silent: the site works the same without it.
 */
export function registerServiceWorker(baseUrl: string, env: { prod: boolean }): void {
  if (!env.prod || !('serviceWorker' in navigator)) return;
  const start = (): void => {
    navigator.serviceWorker
      .register(`${baseUrl}sw.js`, { scope: baseUrl })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const idle = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
        idle(() => registration.active?.postMessage({ type: 'precache-extra' }));
      })
      .catch(() => undefined);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
