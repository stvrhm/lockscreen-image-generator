// Critical PWA plumbing — inlined, dependency-free, ES5-safe.
export function createSwBootScript(nodeEnv: string | undefined): string {
  if (nodeEnv !== 'production') return ''

  return `(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')['catch'](function () {});
  }
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist()['catch'](function () {});
  }
})();`
}

export const swBootScript = createSwBootScript(process.env.NODE_ENV)
