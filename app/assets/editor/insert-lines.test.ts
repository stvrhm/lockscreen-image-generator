import assert from 'node:assert/strict'
import test from 'node:test'

import { insertLines } from './insert-lines.ts'

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

function insert(marked: string, lines: string) {
  let { text, start, end } = insertLines(edit(marked), lines)
  assert.equal(start, end, 'insertion leaves a collapsed cursor')
  return text.slice(0, start) + '|' + text.slice(start)
}

test('fills empty Notes', () => {
  assert.equal(insert('|', '# Pixel 7\nAndroid 14'), '# Pixel 7\nAndroid 14|')
})

test('at the start of a line, pushes that line down', () => {
  assert.equal(insert('|Lab phone', 'Android 14'), 'Android 14|\nLab phone')
})

test('at the end of a line, starts a new line', () => {
  assert.equal(insert('Lab phone|', 'Android 14'), 'Lab phone\nAndroid 14|')
})

test('in the middle of a line, lands on a line of its own', () => {
  assert.equal(insert('Lab| phone', 'Android 14'), 'Lab\nAndroid 14|\n phone')
})

test('on an empty line between lines, adds no extra breaks', () => {
  assert.equal(insert('One\n|\nTwo', 'Android 14'), 'One\nAndroid 14|\nTwo')
})

test('after a trailing line break, adds no leading break', () => {
  assert.equal(insert('Lab phone\n|', '# Pixel 7'), 'Lab phone\n# Pixel 7|')
})

test('replaces a selection', () => {
  assert.equal(insert('# [Pixel]\nAndroid 14', 'Pixel 7'), '# \nPixel 7|\nAndroid 14')
  assert.equal(insert('[old line]\nAndroid 14', '# Pixel 7'), '# Pixel 7|\nAndroid 14')
})
