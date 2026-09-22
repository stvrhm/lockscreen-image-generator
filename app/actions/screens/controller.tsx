import { createController } from 'remix/router'

import { routes } from '../../routes.ts'
import { Document } from '../../ui/document.tsx'

/**
 * Every screen URL is answered with the same shell document. The browser
 * router in `app/assets/browser-router.ts` decides which screen that shell
 * resolves to, so development and the static production build share one route
 * table instead of keeping two in sync.
 */
export default createController(routes.screens, {
  actions: {
    home: (context) => context.render(<Document />),
    newDevice: (context) => context.render(<Document />),
    continueDevice: (context) => context.render(<Document />),
    browseDevices: (context) => context.render(<Document />),
    editDevice: (context) => context.render(<Document />),
  },
})
