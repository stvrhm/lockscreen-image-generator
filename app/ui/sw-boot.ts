// Critical PWA plumbing — inlined, dependency-free, ES5-safe.

// The app is installable from the manifest alone and always loads from the
// network, so it carries no service worker. Older builds shipped a caching
// worker whose cache-first navigation handler could pin a device to a stale
// release; `dist/sw.js` is now a one-shot cleanup worker that unregisters
// itself. This script must never register it, or that worker would reinstall
// on every load and its client reload would loop.
const CLEANUP = `  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      return Promise.all(registrations.map(function (registration) {
        return registration.unregister();
      }));
    }).then(function () {
      if (!('caches' in window)) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf('tdl-') === 0;
        }).map(function (key) {
          return caches.delete(key);
        }));
      });
    })['catch'](function () {});
  }`

// Update detection without a service worker: remember the build id seen when
// this document loaded, then re-read it while the app stays open. Comparing
// against the first-seen value rather than a compile-time constant keeps the
// browser bundle free of build metadata.
const VERSION_CHECK = `  var loadedBuildId = null;
  var updateNotified = false;
  function notifyUpdate() {
    if (updateNotified) return;
    updateNotified = true;
    window.__tdlUpdateAvailable = true;
    window.dispatchEvent(new Event('tdl:update-available'));
  }
  function checkForUpdate() {
    if (updateNotified) return;
    if (document.visibilityState === 'hidden') return;
    fetch('/version.json', { cache: 'no-store' }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (version) {
      if (!version || !version.buildId) return;
      if (loadedBuildId === null) {
        loadedBuildId = version.buildId;
        return;
      }
      if (version.buildId !== loadedBuildId) notifyUpdate();
    })['catch'](function () {});
  }
  window.addEventListener('focus', checkForUpdate);
  document.addEventListener('visibilitychange', checkForUpdate);
  window.setInterval(checkForUpdate, 60000);
  checkForUpdate();`

const PERSIST = `  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist()['catch'](function () {});
  }`

export function createSwBootScript(nodeEnv: string | undefined): string {
  if (nodeEnv === 'development') {
    return `(function () {\n${CLEANUP}\n})();`
  }

  if (nodeEnv !== 'production') return ''

  return `(function () {\n${CLEANUP}\n${VERSION_CHECK}\n${PERSIST}\n})();`
}

export const swBootScript = createSwBootScript(process.env.NODE_ENV)
