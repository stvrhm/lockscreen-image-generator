import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStream } from 'remix/component/server'

import { Icon } from './icon.tsx'

async function renderIcon(props: { name: 'information-circle'; label?: string }) {
  const previousDocument = globalThis.document
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { querySelector: () => ({ href: 'http://test.local/assets/icons.svg' }) },
  })
  try {
    return await new Response(renderToStream(<Icon {...props} />)).text()
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: previousDocument })
  }
}

test('icons are decorative by default and labeled icons expose their name', async () => {
  const decorative = await renderIcon({ name: 'information-circle' }),
    labeled = await renderIcon({ name: 'information-circle', label: 'Device information' })

  assert.match(decorative, /<svg[^>]*aria-hidden="true"/)
  assert.doesNotMatch(decorative, /aria-label=/)
  assert.match(
    decorative,
    /<use href="http:\/\/test\.local\/assets\/icons\.svg#information-circle"/,
  )
  assert.match(labeled, /<svg[^>]*aria-label="Device information"/)
  assert.match(labeled, /role="img"/)
  assert.doesNotMatch(labeled, /aria-hidden=/)
})
