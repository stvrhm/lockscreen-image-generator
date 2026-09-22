import assert from 'node:assert/strict'
import test from 'node:test'

import { createSwBootScript } from './sw-boot.ts'

test('cleans up service workers and tdl caches in development', () => {
  let script = createSwBootScript('development')

  assert.match(script, /getRegistrations\(\)/)
  assert.match(script, /unregister\(\)/)
  assert.match(script, /caches\.delete\(key\)/)
})

test('does not register or clean up service workers in tests', () => {
  assert.equal(createSwBootScript(undefined), '')
})

test('never registers a service worker in production', () => {
  // Registering would reinstall the one-shot cleanup worker on every load and
  // loop its client reload.
  assert.doesNotMatch(createSwBootScript('production'), /serviceWorker\.register/)
})

test('cleans up leftover production service workers', () => {
  let script = createSwBootScript('production')

  assert.match(script, /getRegistrations\(\)/)
  assert.match(script, /unregister\(\)/)
})

test('announces an update when the deployed build id changes', () => {
  let script = createSwBootScript('production')

  assert.match(script, /\/version\.json/)
  assert.match(script, /cache: 'no-store'/)
  assert.match(script, /__tdlUpdateAvailable/)
  assert.match(script, /'tdl:update-available'/)
})

test('re-checks the deployed build id while the app stays open', () => {
  let script = createSwBootScript('production')

  assert.match(script, /addEventListener\('focus'/)
  assert.match(script, /addEventListener\('visibilitychange'/)
  assert.match(script, /setInterval\(/)
})
