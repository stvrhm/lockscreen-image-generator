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
  assert.match(createSwBootScript('production'), /serviceWorker\.register\('\/sw\.js'\)/)
})
