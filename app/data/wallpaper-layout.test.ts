import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMarkdownLines } from './markdown.ts'
import { layoutWallpaper, type WallpaperLine } from './wallpaper-layout.ts'

// Every character is half the font size wide, so widths are easy to predict.
function measure(text: string, font: string): number {
  let fontSize = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1])
  return text.length * fontSize * 0.5
}

const REFERENCE = { width: 1170, height: 2532 }

function layout(notes: string, size = REFERENCE) {
  return layoutWallpaper(parseMarkdownLines(notes), size, measure)
}

function lineText(line: WallpaperLine): string {
  return line.runs.map((run) => run.text).join('')
}

test('sets body text at 58px weight 600 at the 1170px reference width', () => {
  let result = layout('Pixel 9')

  assert.equal(result.shrink, 1)
  assert.equal(result.lines.length, 1)
  assert.equal(result.lines[0].fontSize, 58)
  assert.equal(result.lines[0].weight, 600)
  assert.equal(result.lines[0].height, 58 * 1.35)
  assert.equal(lineText(result.lines[0]), 'Pixel 9')
})

test('scales text with the export width, down to a minimum', () => {
  assert.equal(layout('Pixel 9', { width: 2340, height: 5064 }).lines[0].fontSize, 116)
  assert.equal(layout('Pixel 9', { width: 390, height: 844 }).lines[0].fontSize, 28)
})

test('describes each run with the font it is measured and drawn in', () => {
  let [line] = layout('plain **bold** *italic* `code`').lines
  let fonts = new Map(line.runs.map((run) => [run.text, run.font]))

  assert.match(fonts.get('plain')!, /^normal 600 58px .*sans-serif$/)
  assert.match(fonts.get('bold')!, /^normal 800 58px /)
  assert.match(fonts.get('italic')!, /^italic 600 58px /)
  assert.match(fonts.get('code')!, /monospace$/)
  assert.equal(line.runs.find((run) => run.text === 'code')!.code, true)
})

test('wraps long lines within the side margins and centres each render line', () => {
  // Nine-character words are 261px wide at 58px; three fit in the 1076px text width.
  let words = Array.from({ length: 10 }, () => 'abcdefghi')
  let result = layout(words.join(' '))

  assert.deepEqual(result.lines.map(lineText), [
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi',
  ])

  let [first] = result.lines
  let lineWidth = 29 * 29
  assert.equal(first.runs[0].x, (1170 - lineWidth) / 2)
  assert.equal(first.runs[1].x, first.runs[0].x + 261)
  assert.equal(first.runs[1].width, 29)
  assert.equal(result.lines[3].runs[0].x, (1170 - 261) / 2)
})

test('keeps blank Notes lines as empty render lines', () => {
  let result = layout('one\n\ntwo')

  assert.deepEqual(result.lines.map(lineText), ['one', '', 'two'])
  assert.deepEqual(result.lines[1].runs, [])
})

test('stacks render lines around the vertical centre', () => {
  let result = layout('one\ntwo\nthree')
  let lineHeight = 58 * 1.35

  assert.deepEqual(
    result.lines.map((line) => Math.round(line.y * 100) / 100),
    [1266 - lineHeight, 1266, 1266 + lineHeight].map((y) => Math.round(y * 100) / 100),
  )
})

test('shrinks all text when the Notes are taller than the safe area', () => {
  // 29 lines fit at 58px in the 2330px safe height; 30 do not.
  assert.equal(layout(Array(29).fill('x').join('\n')).shrink, 1)

  let result = layout(Array(30).fill('x').join('\n'))

  assert.equal(result.lines[0].fontSize, 54)
  assert.equal(result.shrink, 54 / 58)
  assert.ok(result.lines.every((line) => line.fontSize === 54))
})

test('re-wraps at the shrunk size', () => {
  // At 58px this 38-character line wraps; after shrinking to 54px it fits.
  let longLine = 'a'.repeat(36) + ' b'
  let result = layout([longLine, ...Array(28).fill('x')].join('\n'))

  assert.equal(result.lines[0].fontSize, 54)
  assert.equal(lineText(result.lines[0]), longLine)
})

test('stops shrinking at a floor even if the Notes still overflow', () => {
  let result = layout(Array(200).fill('x').join('\n'))

  assert.equal(result.lines[0].fontSize, 26)
  assert.equal(result.shrink, 26 / 58)
})
