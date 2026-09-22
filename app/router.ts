import { createRouter, type MiddlewareContext } from 'remix/router'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import screensController from './actions/screens/controller.tsx'
import { routes } from './routes.ts'

// `RouterTypes.context` is augmented once, in `app/assets/browser-router.tsx`,
// with the browser context. It is a superset of what these actions read: they
// only need `context.render`.
type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

export const router = createRouter<AppContext>({
  middleware: [staticFiles('./public', { index: false }), render()],
})

router.map(routes, controller)
router.map(routes.screens, screensController)
