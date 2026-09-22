import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { blankDevice } from '../data/devices.ts'
import { inferPlatform, measureHostExportSize } from '../data/host.ts'
import { routes } from '../routes.ts'
import { BrowseDevices, Editor, Home } from './app.tsx'
import { DeviceStore } from './device-store.ts'

/**
 * Browser-owned screen routes.
 *
 * Each action resolves its own data and returns exactly one screen, so the
 * decision of what to show happens once, before anything renders. Missing
 * Drafts and Devices become real redirect responses, which the SPA runtime
 * follows like any other navigation.
 */
export default createController(routes.screens, {
  actions: {
    async home({ get, render }) {
      let draft = await get(DeviceStore).getLastDraft()
      return render(<Home hasDraft={Boolean(draft)} />)
    },

    newDevice({ render }) {
      let size = measureHostExportSize()
      let draft = blankDevice(inferPlatform(), size.width, size.height)
      return render(<Editor draft={draft} editingNew />)
    },

    async continueDevice({ get, render }) {
      let draft = await get(DeviceStore).getLastDraft()
      if (!draft) return redirect(routes.screens.home.href())
      return render(<Editor draft={draft} editingNew={false} />)
    },

    async browseDevices({ get, render }) {
      let devices = await get(DeviceStore).listDevices()
      return render(<BrowseDevices devices={devices} />)
    },

    async editDevice({ get, params, render }) {
      let draft = await get(DeviceStore).findDevice(params.id)
      if (!draft) return redirect(routes.screens.browseDevices.href())
      return render(<Editor draft={draft} editingNew={false} />)
    },
  },
})
