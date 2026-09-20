import assert from 'node:assert/strict'
import test from 'node:test'

import { createSwBootScript } from './sw-boot.ts'

test('cleans up production service workers during development', () => {
  assert.match(createSwBootScript('development'), /getRegistrations\(\)/)
  assert.match(createSwBootScript('development'), /unregister\(\)/)
})

test('does not register or clean up service workers in tests', () => {
  assert.equal(createSwBootScript(undefined), '')
})

test('registers the service worker for the static production build', () => {
  let script = createSwBootScript('production')
  assert.match(script, /serviceWorker\.register\('\/sw\.js'\)/)
  assert.match(script, /updatefound/)
  assert.match(script, /__tdlPwaUpdateAvailable/)
  assert.match(script, /registration\.update\(\)/)
})

test('checks for service worker updates while the app remains open', () => {
  let script = createSwBootScript('production')
  assert.match(script, /addEventListener\('focus'/)
  assert.match(script, /addEventListener\('visibilitychange'/)
  assert.match(script, /setInterval\(/)
})
