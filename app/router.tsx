import { createRouter, type MiddlewareContext } from 'remix/router'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import screensController from './actions/screens/controller.tsx'
import { routes } from './routes.ts'
import { Document } from './ui/document.tsx'

// `RouterTypes.context` is augmented once, in `app/assets/browser-router.tsx`,
// with the browser context. It is a superset of what these actions read: they
// only need `context.render`.
type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

export const router = createRouter<AppContext>({
  middleware: [staticFiles('./public', { index: false }), render()],
  // Match Netlify's `/* /index.html 200` fallback: unknown URLs still get the
  // shell, so the browser router renders its not-found screen in development
  // exactly as it does in production.
  defaultHandler: (context) => context.render(<Document />, { status: 404 }),
})

router.map(routes, controller)
router.map(routes.screens, screensController)
