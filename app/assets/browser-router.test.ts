import assert from 'node:assert/strict'
import test from 'node:test'

import { routes } from '../routes.ts'
import { createBrowserRouter } from './browser-router.tsx'
import type { DeviceStore } from './device-store.ts'

// `remix/spa`'s render middleware builds responses that carry Remix nodes and
// refuses to run outside a browser, so the screens themselves are covered by
// the browser tier. The redirect contract never reaches render and is asserted
// here: these are the paths that previously mutated `window.location` after a
// screen had already started rendering.
const emptyStore: DeviceStore = {
  listDevices: async () => [],
  findDevice: async () => undefined,
  getLastDraft: async () => undefined,
}

function fetchScreen(href: string, store: DeviceStore = emptyStore) {
  return createBrowserRouter(store).fetch(new Request(`http://test.local${href}`))
}

test('Continue redirects Home when this Host has no Draft', async () => {
  const response = await fetchScreen(routes.screens.continueDevice.href())

  assert.ok(response.status >= 300 && response.status < 400, `got ${response.status}`)
  assert.equal(response.headers.get('Location'), routes.screens.home.href())
})

test('Edit redirects to Browse when the Device is gone', async () => {
  const response = await fetchScreen(routes.screens.editDevice.href({ id: 'missing' }))

  assert.ok(response.status >= 300 && response.status < 400, `got ${response.status}`)
  assert.equal(response.headers.get('Location'), routes.screens.browseDevices.href())
})
