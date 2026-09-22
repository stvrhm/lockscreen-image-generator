import { createRouter, type MiddlewareContext } from 'remix/router'
import { render } from 'remix/spa'

import { AppFrame } from '../ui/app-frame.tsx'
import { NotFoundScreen } from './app.tsx'
import controller from './controller.tsx'
import { deviceStore, type DeviceStore } from './device-store.ts'
import { routes } from '../routes.ts'

export type BrowserContext = MiddlewareContext<
  [ReturnType<typeof render>, ReturnType<typeof deviceStore>]
>

// The app's screen actions all run here, so the browser context is the default
// for controllers. It is a superset of the server router's context.
declare module 'remix/router' {
  interface RouterTypes {
    context: BrowserContext
  }
}

/**
 * The application's only screen router.
 *
 * It runs in the browser for both development and production: the server and
 * the static build serve the same shell document for every screen URL and then
 * hand routing to this router, so there is no second route table to keep in
 * sync.
 */
export function createBrowserRouter(store?: DeviceStore) {
  let router = createRouter<BrowserContext>({
    middleware: [render((content) => <AppFrame>{content}</AppFrame>), deviceStore(store)],
    defaultHandler({ render }) {
      return render(<NotFoundScreen />, { status: 404 })
    },
  })

  router.map(routes.screens, controller)
  return router
}
