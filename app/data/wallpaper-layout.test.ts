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

function assertClose(actual: number, expected: number, message?: string) {
  assert.ok(Math.abs(actual - expected) < 1e-6, message ?? `expected ${actual} to be ${expected}`)
}

function sizes(notes: string, size = REFERENCE) {
  return layout(notes, size).lines.map((line) => line.fontSize)
}

test('sets body text at 72px weight 600 at the 1170px reference width', () => {
  let result = layout('Pixel 9')

  assert.equal(result.shrink, 1)
  assert.equal(result.lines.length, 1)
  assert.equal(result.lines[0].fontSize, 72)
  assert.equal(result.lines[0].weight, 600)
  assertClose(result.lines[0].height, 72 * 1.35)
  assert.equal(lineText(result.lines[0]), 'Pixel 9')
})

test('sets "#" Headings at 1.75x and "##" Headings at 1.35x body, weight 800', () => {
  let [h1, h2, body] = layout('# Pixel 9\n## Android 15\nbody').lines

  assert.equal(h1.fontSize, 126)
  assert.equal(h2.fontSize, 97.2)
  assert.equal(body.fontSize, 72)
  assert.deepEqual([h1.weight, h2.weight, body.weight], [800, 800, 600])
  assert.equal(lineText(h1), 'Pixel 9')
})

test('scales every level with the export width, with a minimum body size', () => {
  let notes = '# a\n## b\nc'

  assert.deepEqual(sizes(notes, { width: 2340, height: 5064 }), [252, 194.4, 144])
  assert.deepEqual(sizes(notes, { width: 585, height: 1266 }), [63, 48.6, 36])
  assert.deepEqual(sizes(notes, { width: 390, height: 844 }), [49, 37.8, 28])
})

test('gives each render line a height of its own font size times 1.35', () => {
  let heights = layout('# a\n## b\nc\n#').lines.map((line) => line.height)

  assertClose(heights[0], 126 * 1.35)
  assertClose(heights[1], 97.2 * 1.35)
  assertClose(heights[2], 72 * 1.35)
  assertClose(heights[3], 126 * 1.35)
})

test('describes each run with the font it is measured and drawn in', () => {
  let [line] = layout('plain **bold** *italic* `code`').lines
  let fonts = new Map(line.runs.map((run) => [run.text, run.font]))

  assert.match(fonts.get('plain')!, /^normal 600 72px .*sans-serif$/)
  assert.match(fonts.get('bold')!, /^normal 800 72px /)
  assert.match(fonts.get('italic')!, /^italic 600 72px /)
  assert.match(fonts.get('code')!, /monospace$/)
  assert.equal(line.runs.find((run) => run.text === 'code')!.code, true)
})

test('keeps inline formatting inside Headings at the Heading size and weight', () => {
  let lines = layout('## plain **bold** *italic*\n## `code` ~~gone~~').lines
  let runs = new Map(lines.flatMap((line) => line.runs).map((run) => [run.text, run]))

  assert.match(runs.get('plain')!.font, /^normal 800 97.2px .*sans-serif$/)
  assert.match(runs.get('bold')!.font, /^normal 800 97.2px /)
  assert.match(runs.get('italic')!.font, /^italic 800 97.2px /)
  assert.match(runs.get('code')!.font, /^normal 800 97.2px .*monospace$/)
  assert.equal(runs.get('gone')!.strike, true)
})

test('wraps long lines within the side margins and centres each render line', () => {
  // Nine-character words are 324px wide at 72px; three fit in the 1076px text width.
  let words = Array.from({ length: 10 }, () => 'abcdefghi')
  let result = layout(words.join(' '))

  assert.deepEqual(result.lines.map(lineText), [
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi abcdefghi abcdefghi',
    'abcdefghi',
  ])

  let [first] = result.lines
  let lineWidth = 29 * 36
  assert.equal(first.runs[0].x, (1170 - lineWidth) / 2)
  assert.equal(first.runs[1].x, first.runs[0].x + 324)
  assert.equal(first.runs[1].width, 36)
  assert.equal(result.lines[3].runs[0].x, (1170 - 324) / 2)
})

test('wraps long Headings like body text, at the Heading size', () => {
  // At 126px a character is 63px wide, so 17 characters fit in 1076px.
  let result = layout('# abcdefgh abcdefgh abcdefgh')

  assert.deepEqual(result.lines.map(lineText), ['abcdefgh abcdefgh', 'abcdefgh'])
  assert.ok(result.lines.every((line) => line.fontSize === 126 && line.weight === 800))
})

test('keeps blank Notes lines as empty render lines', () => {
  let result = layout('one\n\ntwo')

  assert.deepEqual(result.lines.map(lineText), ['one', '', 'two'])
  assert.deepEqual(result.lines[1].runs, [])
})

test('stacks render lines of different heights around the vertical centre', () => {
  let [heading, body] = layout('# a\nb').lines
  let total = 126 * 1.35 + 72 * 1.35
  let top = 1266 - total / 2

  assertClose(heading.y, top + (126 * 1.35) / 2)
  assertClose(body.y, top + 126 * 1.35 + (72 * 1.35) / 2)
})

test('shrinks all text when the Notes are taller than the safe area', () => {
  // 23 body lines fit at 72px in the 2330px safe height; 24 do not.
  assert.equal(layout(Array(23).fill('x').join('\n')).shrink, 1)

  let result = layout(Array(24).fill('x').join('\n'))

  assert.equal(result.shrink, 0.95)
  assert.ok(result.lines.every((line) => line.fontSize === 68.4))
  let total = result.lines.reduce((sum, line) => sum + line.height, 0)
  assert.ok(total <= 2330)
})

test('shrinks Headings and body by the same factor, preserving their ratios', () => {
  let result = layout(['# a', '## b', ...Array(22).fill('c')].join('\n'))
  let [h1, h2, body] = result.lines.map((line) => line.fontSize)

  assert.ok(result.shrink < 1)
  assertClose(body, 72 * result.shrink)
  assert.ok(Math.abs(h1 / body - 1.75) < 0.01)
  assert.ok(Math.abs(h2 / body - 1.35) < 0.01)
})

test('re-wraps at the shrunk size', () => {
  // At 72px this 30-character line wraps; after shrinking to 68.4px it fits.
  let longLine = 'a'.repeat(28) + ' b'
  let result = layout([longLine, ...Array(22).fill('x')].join('\n'))

  assert.equal(result.shrink, 0.95)
  assert.equal(lineText(result.lines[0]), longLine)
})

test('stops shrinking at a floor even if the Notes still overflow', () => {
  let result = layout(['# a', ...Array(200).fill('x')].join('\n'))

  assert.equal(result.shrink, 0.35)
  assert.equal(result.lines[0].fontSize, 44.1)
  assert.equal(result.lines[1].fontSize, 25.2)
})
