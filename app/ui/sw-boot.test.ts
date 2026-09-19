import assert from 'node:assert/strict'
import test from 'node:test'

import { createSwBootScript } from './sw-boot.ts'

test('does not register a service worker outside the static production build', () => {
  assert.equal(createSwBootScript('development'), '')
  assert.equal(createSwBootScript(undefined), '')
})

test('registers the service worker for the static production build', () => {
  assert.match(createSwBootScript('production'), /serviceWorker\.register\('\/sw\.js'\)/)
})
