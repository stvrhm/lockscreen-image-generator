// Critical PWA plumbing — inlined, dependency-free, ES5-safe.
export function createSwBootScript(nodeEnv: string | undefined): string {
  if (nodeEnv === 'development') {
    return `(function () {
  if (!('serviceWorker' in navigator)) return;
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
  }).catch(function () {});
})();`
  }

  if (nodeEnv !== 'production') return ''

  return `(function () {
  if ('serviceWorker' in navigator) {
    var updateNotified = false;
    function notifyUpdate() {
      if (updateNotified) return;
      updateNotified = true;
      window.__tdlPwaUpdateAvailable = true;
      window.dispatchEvent(new Event('tdl:sw-update'));
    }
    function watchRegistration(registration) {
      function watchWorker(worker) {
        if (!worker) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
        });
      }
      watchWorker(registration.waiting);
      registration.addEventListener('updatefound', function () {
        watchWorker(registration.installing);
      });
      function checkForUpdate() {
        if (document.visibilityState === 'hidden') return;
        registration.update()['catch'](function () {});
      }
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', checkForUpdate);
      window.setInterval(checkForUpdate, 60000);
      checkForUpdate();
    }
    navigator.serviceWorker.register('/sw.js').then(watchRegistration)['catch'](function () {});
  }
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist()['catch'](function () {});
  }
})();`
}

export const swBootScript = createSwBootScript(process.env.NODE_ENV)
