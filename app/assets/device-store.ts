import { type Middleware, createContextKey } from 'remix/router'

import { type Device, findDevice, getLastDraft, listDevices } from '../data/devices.ts'

/**
 * The reads the screen routes need before they can decide what to render.
 *
 * Only reads are injected. Mutations stay as direct `app/data/devices.ts`
 * imports in the screens, because a route never has to branch on their result.
 * Injecting the reads is what lets the route contract — which screen renders,
 * and which redirects — be tested without an IndexedDB implementation.
 */
export interface DeviceStore {
  listDevices(): Promise<Device[]>
  findDevice(id: string): Promise<Device | undefined>
  getLastDraft(): Promise<Device | undefined>
}

/** Host-local IndexedDB store used by the running app. */
export const indexedDbDeviceStore: DeviceStore = { findDevice, getLastDraft, listDevices }

// Defaulted so actions read a store rather than an optional one. Tests pass a
// Replacement to `createBrowserRouter()`, which overrides it per request.
export const DeviceStore = createContextKey<DeviceStore>(indexedDbDeviceStore)

export function deviceStore(store: DeviceStore = indexedDbDeviceStore): Middleware {
  return (context, next) => {
    context.set(DeviceStore, store)
    return next()
  }
}
