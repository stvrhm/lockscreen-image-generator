import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { blankDevice, nextDeviceLabel } from '../data/devices.ts'
import { inferPlatform, measureHostExportSize } from '../data/host.ts'
import { phoneInfoNotes, readPhoneInfo } from '../data/phone-info.ts'
import { routes } from '../routes.ts'
import { DeviceStore } from './device-store.ts'
import { BrowseDevices } from './screens/browse-devices.tsx'
import { Editor } from './screens/editor.tsx'
import { Home } from './screens/home.tsx'

/**
 * Browser-owned screen routes.
 *
 * Each action resolves its own data and returns exactly one screen, so the
 * decision of what to show happens once, before anything renders. Missing
 * Drafts and Devices become real redirect responses, which the SPA runtime
 * follows like any other navigation.
 *
 * Screens in `./screens/` receive the data their route already resolved and
 * never inspect the location or decide which screen they are; that was the
 * source of two screens rendering into the same document.
 */
export default createController(routes.screens, {
  actions: {
    async home({ get, render }) {
      let draft = await get(DeviceStore).getLastDraft()
      return render(<Home hasDraft={Boolean(draft)} />)
    },

    async newDevice({ get, render }) {
      let size = measureHostExportSize()
      // Detection is near-instant and time-limited, so waiting for it keeps
      // the New Device complete on first render.
      let [info, devices] = await Promise.all([readPhoneInfo(), get(DeviceStore).listDevices()])
      let draft = {
        ...blankDevice(inferPlatform(), size.width, size.height),
        label: nextDeviceLabel(devices),
        notes: phoneInfoNotes(info),
      }
      return render(<Editor draft={draft} devices={devices} editingNew />)
    },

    async continueDevice({ get, render }) {
      let store = get(DeviceStore)
      let [draft, devices] = await Promise.all([store.getLastDraft(), store.listDevices()])
      if (!draft) return redirect(routes.screens.home.href())
      return render(<Editor draft={draft} devices={devices} editingNew={false} />)
    },

    async browseDevices({ get, render }) {
      let devices = await get(DeviceStore).listDevices()
      return render(<BrowseDevices devices={devices} />)
    },

    async editDevice({ get, params, render }) {
      let store = get(DeviceStore)
      let [draft, devices] = await Promise.all([store.findDevice(params.id), store.listDevices()])
      if (!draft) return redirect(routes.screens.browseDevices.href())
      return render(<Editor draft={draft} devices={devices} editingNew={false} />)
    },
  },
})
