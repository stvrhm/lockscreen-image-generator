import assert from 'node:assert/strict'
import test from 'node:test'

import { iconSpriteHref } from './assets.ts'
import { router } from './router.tsx'
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

test('the shell preloads the JSX runtime for the browser entry', async () => {
  const response = await fetchScreen(routes.screens.home.href()),
    html = await response.text()

  assert.match(html, /href="\/assets\/npm\/%40remix-run\/component\/dist\/runtime\/jsx\.js"/)
})

test('the shell preloads the served icon sprite with an ETag', async () => {
  const response = await fetchScreen(routes.screens.home.href()),
    html = await response.text(),
    preload = html.match(
      /<link rel="preload" as="image" type="image\/svg\+xml" href="([^"]+)" data-icon-sprite \/>/,
    )

  assert.ok(preload)
  assert.equal(preload[1], iconSpriteHref)

  const sprite = await router.fetch(new Request(`http://test.local${iconSpriteHref}`))
  assert.equal(sprite.status, 200)
  assert.match(sprite.headers.get('content-type') ?? '', /image\/svg\+xml/)
  assert.ok(sprite.headers.get('etag'))
  assert.match(await sprite.text(), /<symbol id="information-circle"/)

  const cached = await router.fetch(
    new Request(`http://test.local${iconSpriteHref}`, {
      headers: { 'if-none-match': sprite.headers.get('etag')! },
    }),
  )
  assert.equal(cached.status, 304)
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
  // Actually asked for. The browser router owns the body, so it must ship
  // Empty and free of any screen's copy.
  const html = await (await fetchScreen(routes.screens.browseDevices.href())).text()

  assert.match(html, /<body><\/body>/)
  assert.doesNotMatch(html, new RegExp(strings.start.title))
  assert.doesNotMatch(html, new RegExp(strings.browse.title))
})
