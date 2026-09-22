import { run } from 'remix/spa'

// Keep the UI HMR runtime in the initial import map so loader-injected HMR
// imports resolve in browsers that only use the initial map.
import { __uiHmrBrowserRuntime__ } from 'remix/ui-hmr/runtime/browser'
import * as uiRefresh from 'remix/ui/dev/refresh'

import { LoadingScreen } from './app.tsx'
import { createBrowserRouter } from './browser-router.tsx'

void __uiHmrBrowserRuntime__
void uiRefresh

// Every screen URL is served the same shell document, so routing starts here:
// the SPA runtime dispatches the current URL and all later same-origin
// navigations through the router. Service worker cleanup and update checks
// live in the inline sw-boot script.
const app = run(createBrowserRouter(), { fallback: <LoadingScreen /> })

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
