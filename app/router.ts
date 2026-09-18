import { createRouter, type MiddlewareContext } from 'remix/router'
import { formData } from 'remix/middleware/form-data'
import { methodOverride } from 'remix/middleware/method-override'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import devicesController from './actions/devices/controller.tsx'
import { assets } from './assets.ts'
import { routes } from './routes.ts'

const formDataMiddleware = formData()
const renderMiddleware = render({ assets })
type AppContext = MiddlewareContext<[typeof formDataMiddleware, typeof renderMiddleware]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

export const router = createRouter<AppContext>({
  middleware: [
    staticFiles('./public', { index: false }),
    formDataMiddleware,
    methodOverride(),
    renderMiddleware,
  ],
})

router.map(routes, controller)
router.map(routes.devices, devicesController)
