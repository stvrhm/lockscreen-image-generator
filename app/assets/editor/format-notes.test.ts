import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMarkdownLines } from '../../data/markdown.ts'
import { inlineFormatActive, toggleInlineFormat, type InlineFormat } from './format-notes.ts'
import type { NotesEdit } from './set-heading.ts'

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

function press(marked: string, format: InlineFormat) {
  return show(toggleInlineFormat(edit(marked), format))
}

function active(marked: string, format: InlineFormat) {
  let { text, start, end } = edit(marked)
  return inlineFormatActive(text, start, end, format)
}

test('a selection in plain text gains that format and stays selected', () => {
  assert.equal(press('[hello]', 'bold'), '**[hello]**')
  assert.equal(press('[hello]', 'italic'), '*[hello]*')
  assert.equal(press('[hello]', 'strike'), '~~[hello]~~')
  assert.equal(press('[hello]', 'code'), '`[hello]`')
})

test('pressing the active format removes it from the selection', () => {
  assert.equal(press('**[hello]**', 'bold'), '[hello]')
  assert.equal(press('[**hello**]', 'bold'), '[hello]')
  assert.equal(press('*[hello]*', 'italic'), '[hello]')
})

test('a partial selection leaves the rest of the span alone', () => {
  assert.equal(press('**hello [world]**', 'bold'), '**hello **[world]')
})

test('a caret inside a span removes that format from the whole span', () => {
  assert.equal(press('**hel|lo**', 'bold'), 'hel|lo')
  assert.equal(press('`hel|lo`', 'code'), 'hel|lo')
})

test('a caret in plain text inserts an empty pair and a second press removes it', () => {
  assert.equal(press('hel|lo', 'bold'), 'hel**|**lo')
  assert.equal(press('hel**|**lo', 'bold'), 'hel|lo')
  assert.equal(press('hel|lo', 'italic'), 'hel*|*lo')
  assert.equal(press('hel|lo', 'code'), 'hel`|`lo')
})

test('a caret just outside a span starts a new pair', () => {
  assert.equal(press('**bold**|', 'bold'), '**bold****|**')
  assert.equal(press('|**bold**', 'bold'), '**|****bold**')
  assert.equal(active('**bold**|', 'bold'), false)
  assert.equal(active('|**bold**', 'bold'), false)
})

test('bold and italic combine, and each can be removed on its own', () => {
  assert.equal(press('**[hello]**', 'italic'), '***[hello]***')
  assert.equal(press('***[hello]***', 'bold'), '*[hello]*')
  assert.equal(press('***hel|lo***', 'italic'), '**hel|lo**')
})

test('code and strikethrough replace any other inline format', () => {
  assert.equal(press('**[hello]**', 'code'), '`[hello]`')
  assert.equal(press('*[hello]*', 'strike'), '~~[hello]~~')
  assert.equal(press('`hel|lo`', 'bold'), '**hel|lo**')
})

test('a mixed selection turns the format on without stacking markers', () => {
  assert.equal(press('[hello **world**]', 'bold'), '**[hello world]**')
  assert.equal(press('[**one** two]', 'italic'), '***[one**** two]*')
})

test('each line of a multi-line selection changes on its own', () => {
  assert.equal(press('[hello\nworld]', 'bold'), '**[hello**\n**world]**')
  assert.equal(active('**[hello**\n**world]**', 'bold'), true)
})

test('a button is pressed only when the whole selection has the format', () => {
  assert.equal(active('**[hello]**', 'bold'), true)
  assert.equal(active('**hel|lo**', 'bold'), true)
  assert.equal(active('[hello **world**]', 'bold'), false)
  assert.equal(active('**hello**|', 'bold'), false)
  assert.equal(active('***[both]***', 'bold'), true)
  assert.equal(active('***[both]***', 'italic'), true)
})

test('an empty pair keeps its button pressed', () => {
  assert.equal(active('**|**', 'bold'), true)
  assert.equal(active('*|*', 'italic'), true)
})

test('a line containing the marker character does not change', () => {
  assert.equal(press('[a*b]', 'bold'), '[a*b]')
  assert.equal(press('[a*b]', 'italic'), '[a*b]')
  assert.equal(press('[a`b]', 'code'), '[a`b]')
  assert.equal(press('[a~b]', 'strike'), '[a~b]')
})

test('underscores are ordinary text and can be wrapped', () => {
  assert.equal(active('[__bold__]', 'bold'), false)
  assert.equal(press('[__bold__]', 'bold'), '**[__bold__]**')
})

test('a Heading prefix stays put when an inline format changes', () => {
  assert.equal(press('# [Pixel]', 'bold'), '# **[Pixel]**')
  assert.equal(press('# **[Pixel]**', 'bold'), '# [Pixel]')
})

test('the Wallpaper reads back the toggled formatting', () => {
  let next = toggleInlineFormat(edit('[hello **there**]'), 'italic')
  assert.deepEqual(parseMarkdownLines(next.text), [
    {
      heading: 'body',
      segments: [
        { text: 'hello ', italic: true },
        { text: 'there', bold: true, italic: true },
      ],
    },
  ])
})
