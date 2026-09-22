import assert from 'node:assert/strict'
import test from 'node:test'

import { router } from './router.ts'
import { routes } from './routes.ts'
import { strings } from './strings.ts'

const screenHrefs = [
  routes.screens.home.href(),
  routes.screens.newDevice.href(),
  routes.screens.continueDevice.href(),
  routes.screens.browseDevices.href(),
  routes.screens.editDevice.href({ id: 'example' }),
]

function fetchScreen(href: string) {
  return router.fetch(new Request(`http://test.local${href}`))
}

test('the shell resolves JSX runtime imports for the browser entry', async () => {
  const response = await fetchScreen(routes.screens.home.href())
  const html = await response.text()

  assert.match(html, /"remix\/ui\/jsx-runtime":"\/assets\/npm\/remix\/dist\/ui\/jsx-runtime\.js"/)
})

test('every screen URL is served the same shell', async () => {
  const bodies = await Promise.all(
    screenHrefs.map(async (href) => (await fetchScreen(href)).text()),
  )

  for (const [index, body] of bodies.entries()) {
    assert.equal(body, bodies[0], `${screenHrefs[index]} served a different shell`)
  }
})

test('the shell renders no screen content', async () => {
  // A screen baked into the shell used to render alongside the screen the URL
  // actually asked for. The browser router owns the body, so it must ship
  // empty and free of any screen's copy.
  const html = await (await fetchScreen(routes.screens.browseDevices.href())).text()

  assert.match(html, /<body><\/body>/)
  assert.doesNotMatch(html, new RegExp(strings.start.title))
  assert.doesNotMatch(html, new RegExp(strings.browse.title))
})
