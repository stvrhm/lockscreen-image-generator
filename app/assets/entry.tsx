import { run } from 'remix/spa'

// Keep the UI HMR runtime in the initial import map so loader-injected HMR
// imports resolve in browsers that only use the initial map.
import { __uiHmrBrowserRuntime__ } from 'remix/ui-hmr/runtime/browser'
import * as uiRefresh from 'remix/ui/dev/refresh'

import { LoadingScreen } from './app.tsx'
import { createBrowserRouter } from './browser-router.tsx'

void __uiHmrBrowserRuntime__
void uiRefresh

const router = createBrowserRouter()
const redirectStatuses = new Set([301, 302, 303, 307, 308])
let resolvingInitialRoute = true

// Every screen URL is served the same shell document, so routing starts here:
// the SPA runtime dispatches the current URL and all later same-origin
// navigations through the router. Service worker cleanup and update checks
// live in the inline sw-boot script.
//
// remix/spa (3.0.0-rc.2) follows redirects for the initial route but only
// updates the address bar for later navigations, so a first load of
// `/devices/continue` without a Draft would show Home under the old URL. Once
// the initial route settles on a non-redirect response, move the address bar to
// the URL that actually rendered. Drop this if a later release does it itself.
const app = run(
  {
    async fetch(input, init) {
      let response = await router.fetch(input, init)
      if (resolvingInitialRoute && !redirectStatuses.has(response.status)) {
        resolvingInitialRoute = false
        let url = new URL(input instanceof Request ? input.url : input, location.href)
        if (url.href !== location.href) history.replaceState(history.state, '', url)
      }
      return response
    },
  },
  { fallback: <LoadingScreen /> },
)

app.addEventListener('error', (event) => {
  console.error('Screen failed to render', event.error)
})

await app.ready()

if (import.meta.hot) {
  import.meta.hot.on('server:update', async () => {
    try {
      await app.frames.top.reload()
    } catch (error) {
      console.error('Error reloading top frame on server update', error)
    }
  })
}
