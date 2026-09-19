import assert from 'node:assert/strict'
import test from 'node:test'

import { router } from './router.ts'

test('home resolves JSX runtime imports for hydrated client entries', async () => {
  const response = await router.fetch(new Request('http://test.local/'))
  const html = await response.text()

  assert.match(html, /"remix\/ui\/jsx-runtime":"\/assets\/npm\/remix\/dist\/ui\/jsx-runtime\.js"/)
})
