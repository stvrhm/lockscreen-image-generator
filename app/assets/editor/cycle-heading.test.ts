import assert from 'node:assert/strict'
import test from 'node:test'

import { cycleHeading } from './cycle-heading.ts'

// `|` marks a collapsed cursor; `[` and `]` mark a selection.
function edit(marked: string) {
  let cursor = marked.indexOf('|')
  if (cursor !== -1) {
    return { text: marked.replace('|', ''), start: cursor, end: cursor }
  }
  let start = marked.indexOf('[')
  let end = marked.indexOf(']') - 1
  return { text: marked.replace('[', '').replace(']', ''), start, end }
}

function press(marked: string) {
  let { text, start, end } = cycleHeading(edit(marked))
  if (start === end) return text.slice(0, start) + '|' + text.slice(start)
  return text.slice(0, start) + '[' + text.slice(start, end) + ']' + text.slice(end)
}

test('a plain line becomes a # Heading', () => {
  assert.equal(press('Pix|el 8'), '# Pix|el 8')
})

test('a # Heading becomes a ## Heading', () => {
  assert.equal(press('# Pix|el 8'), '## Pix|el 8')
})

test('a ## Heading becomes plain', () => {
  assert.equal(press('## Pix|el 8'), 'Pix|el 8')
})

test('successive presses cycle plain, #, ## and back to plain', () => {
  let state = edit('Pixel 8|')
  let texts = []
  for (let i = 0; i < 3; i++) {
    state = cycleHeading(state)
    texts.push(state.text)
  }
  assert.deepEqual(texts, ['# Pixel 8', '## Pixel 8', 'Pixel 8'])
  assert.equal(state.start, 'Pixel 8'.length)
})

test('only the line holding the cursor changes', () => {
  assert.equal(press('Pixel 8\nAndr|oid 15\nNotes'), 'Pixel 8\n# Andr|oid 15\nNotes')
})

test('a cursor on an empty line leaves it ready to type the Heading', () => {
  assert.equal(press('Pixel 8\n|\nNotes'), 'Pixel 8\n# |\nNotes')
  assert.equal(press('|'), '# |')
})

test('a cursor at the start of a plain line ends up after the new marker', () => {
  assert.equal(press('|Pixel 8'), '# |Pixel 8')
})

test('a cursor inside a removed marker lands at the start of the text', () => {
  assert.equal(press('#|# Pixel 8'), '|Pixel 8')
  assert.equal(press('#| Pixel 8'), '## |Pixel 8')
})

test('a selection keeps covering the same text', () => {
  assert.equal(press('# Pi[xel] 8'), '## Pi[xel] 8')
  assert.equal(press('## Pi[xel] 8'), 'Pi[xel] 8')
})

test('a multi-line selection takes its next level from the first selected line', () => {
  assert.equal(press('Pi[xel 8\n## Android] 15'), '# Pi[xel 8\n# Android] 15')
  assert.equal(press('# Pi[xel 8\nAndroid] 15'), '## Pi[xel 8\n## Android] 15')
  assert.equal(press('## Pi[xel 8\n# Android] 15'), 'Pi[xel 8\nAndroid] 15')
})

test('every line touched by the selection changes, untouched lines do not', () => {
  assert.equal(
    press('Before\nPi[xel 8\nmiddle\nAndr]oid 15\nAfter'),
    'Before\n# Pi[xel 8\n# middle\n# Andr]oid 15\nAfter',
  )
})

test('a selection ending at the start of a line does not touch that line', () => {
  assert.equal(press('[Pixel 8\n]Android 15'), '# [Pixel 8\n]Android 15')
})

test('a selection starting at the start of a plain line still covers the text', () => {
  assert.equal(press('[Pixel 8]'), '# [Pixel 8]')
})

test('a ### line counts as plain, and its hashes are replaced by the # marker', () => {
  assert.equal(press('### Pix|el 8'), '# Pix|el 8')
  assert.equal(press('#### Pix|el 8'), '# Pix|el 8')
})

test('a ### line is left alone when the selection turns lines plain', () => {
  assert.equal(press('## Pi[xel 8\n### Android] 15'), 'Pi[xel 8\n### Android] 15')
})

test('a bare marker counts as a Heading', () => {
  assert.equal(press('#|'), '## |')
  assert.equal(press('##|'), '|')
})

test('a # without a space is plain text', () => {
  assert.equal(press('#hash|tag'), '# #hash|tag')
})
