export interface PendingNavigation { url: string; key: string; type: string }

/** Guards browser and link navigation while an Editor has unsaved changes. */
export function guardEditorNavigation(options: {
  isDirty(): boolean
  onRequest(destination: PendingNavigation): void
}) {
  let currentUrl = location.href,
   {navigation} = window

  function request(url: string, key = '', type = 'push') {
    if (url === location.href || new URL(url).origin !== location.origin || !options.isDirty()) {
      return false
    }
    options.onRequest({ key, type, url })
    return true
  }

  function onNavigate(event: NavigateEvent) {
    if (request(event.destination.url, event.destination.key, event.navigationType)) {
      event.preventDefault()
    } else {
      currentUrl = location.href
    }
  }

  function onClick(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      {return}
    const target = event.target
    if (!(target instanceof Element)) {return}
    const link = target.closest('a[href]')
    if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download')) {return}
    if (request(link.href)) {event.preventDefault()}
  }

  function onPopState() {
    if (navigation || !options.isDirty()) {
      currentUrl = location.href
      return
    }
    const destinationUrl = location.href
    history.pushState(history.state, '', currentUrl)
    options.onRequest({ key: '', type: 'fallback-back', url: destinationUrl })
  }

  navigation?.addEventListener('navigate', onNavigate, { capture: true })
  document.addEventListener('click', onClick, true)
  window.addEventListener('popstate', onPopState)

  return {
    dispose() {
      navigation?.removeEventListener('navigate', onNavigate, { capture: true })
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    },
    updateCurrentUrl(url: string) {
      currentUrl = new URL(url, location.href).href
    },
  }
}
