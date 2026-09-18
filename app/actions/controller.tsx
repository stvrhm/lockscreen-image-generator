import { createController } from 'remix/router'

import { assets } from '../assets.ts'
import { listDevices } from '../data/devices.ts'
import { routes } from '../routes.ts'
import { HomePage } from './home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (await assets.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
    },
    async home(context) {
      let query = context.url.searchParams.get('q')?.trim() ?? ''
      let devices = await listDevices()
      if (query) {
        let needle = query.toLowerCase()
        devices = devices.filter((device) => device.label.toLowerCase().includes(needle))
      }
      return context.render(<HomePage devices={devices} query={query} />)
    },
  },
})
