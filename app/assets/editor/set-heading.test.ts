import assert from 'node:assert/strict'
import test from 'node:test'

import { headingPressed, setHeading, type NotesEdit } from './set-heading.ts'

// `|` marks a collapsed cursor; `[` and `]` mark a selection.
function edit(marked: string): NotesEdit {
  let cursor = marked.indexOf('|')
  if (cursor !== -1) {
    return { text: marked.replace('|', ''), start: cursor, end: cursor }
  }
  let start = marked.indexOf('[')
  let end = marked.indexOf(']') - 1
  return { text: marked.replace('[', '').replace(']', ''), start, end }
}

function show({ text, start, end }: NotesEdit) {
  if (start === end) return text.slice(0, start) + '|' + text.slice(start)
  return text.slice(0, start) + '[' + text.slice(start, end) + ']' + text.slice(end)
}

function press(marked: string, level: 1 | 2) {
  return show(setHeading(edit(marked), level))
}

test('a plain line becomes the Heading level that was pressed', () => {
  assert.equal(press('Pix|el 8', 1), '# Pix|el 8')
  assert.equal(press('Pix|el 8', 2), '## Pix|el 8')
})

test('pressing the active Heading level clears it', () => {
  assert.equal(press('# Pix|el 8', 1), 'Pix|el 8')
  assert.equal(press('## Pix|el 8', 2), 'Pix|el 8')
})

test('pressing the other Heading level switches the line', () => {
  assert.equal(press('# Pix|el 8', 2), '## Pix|el 8')
  assert.equal(press('## Pix|el 8', 1), '# Pix|el 8')
})

test('only the line holding the cursor changes', () => {
  assert.equal(press('Pixel 8\nAndr|oid 15\nNotes', 1), 'Pixel 8\n# Andr|oid 15\nNotes')
})

test('a cursor on an empty line leaves it ready to type the Heading', () => {
  assert.equal(press('Pixel 8\n|\nNotes', 1), 'Pixel 8\n# |\nNotes')
  assert.equal(press('|', 2), '## |')
})

test('a cursor at the start of a plain line ends up after the new marker', () => {
  assert.equal(press('|Pixel 8', 1), '# |Pixel 8')
})

test('a cursor inside a removed marker lands at the start of the text', () => {
  assert.equal(press('#| Pixel 8', 1), '|Pixel 8')
  assert.equal(press('##| Pixel 8', 2), '|Pixel 8')
})

test('a selection keeps covering the same text', () => {
  assert.equal(press('# Pi[xel] 8', 2), '## Pi[xel] 8')
  assert.equal(press('## Pi[xel] 8', 2), 'Pi[xel] 8')
})

test('a mixed selection sets every touched line to the pressed level', () => {
  assert.equal(press('Pi[xel 8\n## Android] 15', 1), '# Pi[xel 8\n# Android] 15')
  assert.equal(press('# Pi[xel 8\n## Android] 15', 2), '## Pi[xel 8\n## Android] 15')
})

test('every line touched by the selection changes, untouched lines do not', () => {
  assert.equal(
    press('Before\nPi[xel 8\nmiddle\nAndr]oid 15\nAfter', 1),
    'Before\n# Pi[xel 8\n# middle\n# Andr]oid 15\nAfter',
  )
})

test('a selection ending at the start of a line does not touch that line', () => {
  assert.equal(press('[Pixel 8\n]Android 15', 1), '# [Pixel 8\n]Android 15')
})

test('a selection starting at the start of a plain line still covers the text', () => {
  assert.equal(press('[Pixel 8]', 1), '# [Pixel 8]')
})

test('a run of hashes is replaced by the pressed Heading', () => {
  assert.equal(press('### Pix|el 8', 1), '# Pix|el 8')
  assert.equal(press('#### Pix|el 8', 2), '## Pix|el 8')
})

test('a bare marker counts as that Heading', () => {
  assert.equal(press('#|', 1), '|')
  assert.equal(press('##|', 1), '# |')
})

test('a # without a space is plain text', () => {
  assert.equal(press('#hash|tag', 1), '# #hash|tag')
})

test('a Heading button is pressed only when every touched line is that level', () => {
  assert.equal(headingPressed('# Pixel', 0, 7, 1), true)
  assert.equal(headingPressed('# Pixel', 0, 7, 2), false)
  assert.equal(headingPressed('# Pixel\n## Android', 0, 18, 1), false)
  assert.equal(headingPressed('### Pixel', 0, 9, 1), false)
})
