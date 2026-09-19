import {
  detectMultipleImportMapSupport,
  importModule,
  preloadShim,
} from 'remix/multiple-import-maps-polyfill'
import { run } from 'remix/ui'

// Keep the UI HMR runtime modules in the initial import map. Components are
// loaded after the document, so their loader-injected HMR imports would
// otherwise be unresolved in browsers that use the initial map only.
import { __uiHmrBrowserRuntime__ } from 'remix/ui-hmr/runtime/browser'
import * as uiRefresh from 'remix/ui/dev/refresh'

void __uiHmrBrowserRuntime__
void uiRefresh

// Hydrate client-entry islands. SW registration lives in the inline sw-boot script.
const app = run({
  async loadModule(moduleUrl, exportName) {
    let mod = await importModule(moduleUrl)
    let Component = mod[exportName]
    if (typeof Component !== 'function') {
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`)
    }
    return Component
  },
  async processClientEntryPreloads(preloads) {
    if (await detectMultipleImportMapSupport()) return preloads

    preloadShim(preloads)
    return []
  },
})

if (import.meta.hot) {
  import.meta.hot.on('server:update', async () => {
    try {
      await app.ready()
      await app.frames.top.reload()
    } catch (error) {
      console.error('Error reloading top frame on server update', error)
    }
  })
}
