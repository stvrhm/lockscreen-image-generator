import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMarkdownLines } from './markdown.ts'

test('parses each Notes line as body text with its inline segments', () => {
  assert.deepEqual(parseMarkdownLines('plain **bold**\n'), [
    { heading: 'body', segments: [{ text: 'plain ' }, { text: 'bold', bold: true }] },
    { heading: 'body', segments: [{ text: '' }] },
  ])
})

test('reads a line starting with "# " as a level 1 Heading without the marker', () => {
  assert.deepEqual(parseMarkdownLines('# Pixel 9'), [
    { heading: 1, segments: [{ text: 'Pixel 9' }] },
  ])
})

test('reads a line starting with "## " as a level 2 Heading without the marker', () => {
  assert.deepEqual(parseMarkdownLines('## Android 15'), [
    { heading: 2, segments: [{ text: 'Android 15' }] },
  ])
})

test('keeps "###" and deeper as body text with the hashes visible', () => {
  assert.deepEqual(parseMarkdownLines('### Build\n#### Notes'), [
    { heading: 'body', segments: [{ text: '### Build' }] },
    { heading: 'body', segments: [{ text: '#### Notes' }] },
  ])
})

test('keeps a hash not followed by a space as body text', () => {
  assert.deepEqual(parseMarkdownLines('#tag\n##tag'), [
    { heading: 'body', segments: [{ text: '#tag' }] },
    { heading: 'body', segments: [{ text: '##tag' }] },
  ])
})

test('reads a bare "#" or "##" as an empty Heading, so it renders as a blank line', () => {
  assert.deepEqual(parseMarkdownLines('#\n##'), [
    { heading: 1, segments: [{ text: '' }] },
    { heading: 2, segments: [{ text: '' }] },
  ])
})

test('parses inline formatting inside Headings', () => {
  assert.deepEqual(parseMarkdownLines('# **Pixel** *9* `Pro` ~~XL~~'), [
    {
      heading: 1,
      segments: [
        { text: 'Pixel', bold: true },
        { text: ' ' },
        { text: '9', italic: true },
        { text: ' ' },
        { text: 'Pro', code: true },
        { text: ' ' },
        { text: 'XL', strike: true },
      ],
    },
  ])
})
