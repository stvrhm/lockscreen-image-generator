import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import { routes } from '../routes.ts'
import { AppShell } from '../ui/app-shell.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    home(context) {
      return context.render(<AppShell route="start" />)
    },
    newDevice(context) {
      return context.render(<AppShell route="new" />)
    },
    continueDevice(context) {
      return context.render(<AppShell route="continue" />)
    },
    browseDevices(context) {
      return context.render(<AppShell route="browse" />)
    },
    editDevice(context) {
      return context.render(<AppShell route="edit" deviceId={context.params.id} />)
    },
  },
})
