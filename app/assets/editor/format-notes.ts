import { type InlineToken, tokenizeInline } from '../../data/markdown.ts'

import type { NotesEdit } from './set-heading.ts'

export type InlineFormat = 'bold' | 'italic' | 'strike' | 'code'

interface Style { bold: boolean; italic: boolean; code: boolean; strike: boolean }

interface Span {
  text: string
  style: Style
  from: number
  to: number
  contentFrom: number
  contentTo: number
}

interface Piece {
  text: string
  style: Style
  /** Selected slice of `text`, or a caret when the two ends match. */
  selected: [number, number] | null
  /** Keep a newly inserted pair from merging into the span beside the caret. */
  isolate?: boolean
}

const PLAIN: Style = { bold: false, code: false, italic: false, strike: false }

function isPlain(style: Style) {
  return !style.bold && !style.italic && !style.code && !style.strike
}

function styleOf(token: InlineToken): Style {
  return {
    bold: token.bold === true,
    code: token.code === true,
    italic: token.italic === true,
    strike: token.strike === true,
  }
}

function markers(style: Style): [string, string] {
  if (style.code) {return ['`', '`']}
  if (style.strike) {return ['~~', '~~']}
  if (style.bold && style.italic) {return ['***', '***']}
  if (style.bold) {return ['**', '**']}
  if (style.italic) {return ['*', '*']}
  return ['', '']
}

function withFormat(style: Style, format: InlineFormat, enabled: boolean): Style {
  if (!enabled) {return { ...style, [format]: false }}
  if (format === 'code') {return { bold: false, italic: false, code: true, strike: false }}
  if (format === 'strike') {return { bold: false, italic: false, code: false, strike: true }}
  return { ...style, [format]: true, code: false, strike: false }
}

function breaks(format: InlineFormat, text: string) {
  if (format === 'bold' || format === 'italic') {return text.includes('*')}
  if (format === 'strike') {return text.includes('~')}
  return text.includes('`')
}

interface LineSpan { line: string; start: number; end: number }

function lineSpans(text: string): LineSpan[] {
  const lines: LineSpan[] = []
  let start = 0
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === '\n') {
      lines.push({ end: i, line: text.slice(start, i), start })
      start = i + 1
    }
  }
  return lines
}

/** Character overlap with a line. A caret may sit at the end of the line. */
function localSelection(
  text: string,
  start: number,
  end: number,
  line: LineSpan,
): { start: number; end: number } | null {
  if (start === end) {
    if (start >= line.start && start <= line.end) {return { start, end }}
    return null
  }
  const last = text[end - 1] === '\n' ? end - 1 : end
  const from = Math.max(start, line.start)
  const to = Math.min(last, line.end)
  if (from < to) {return { start: from, end: to }}
  return null
}

function emptyPair(source: string, index: number): { len: number; style: Style } | null {
  const DOUBLE_MARKER_LENGTH = 4,
   STRONG_ITALIC_MARKER_LENGTH = 6
  const ch = source[index]
  if (!ch || (index > 0 && source[index - 1] === ch)) {return null}
  if (ch !== '*' && ch !== '~' && ch !== '`') {return null}
  let len = 0
  while (source[index + len] === ch) {len++}
  if (ch === '*' && len === STRONG_ITALIC_MARKER_LENGTH) {
    return { len, style: { bold: true, code: false, italic: true, strike: false } }
  }
  if (ch === '*' && len === DOUBLE_MARKER_LENGTH) {return { len, style: { ...PLAIN, bold: true } }}
  if (ch === '*' && len === 2) {return { len, style: { ...PLAIN, italic: true } }}
  if (ch === '~' && len === DOUBLE_MARKER_LENGTH) {return { len, style: { ...PLAIN, strike: true } }}
  if (ch === '`' && len === 2) {return { len, style: { ...PLAIN, code: true } }}
  return null
}

function span(text: string, from: number, to: number, style: Style, marker: number): Span {
  return {
    contentFrom: from + marker,
    contentTo: to - marker,
    from,
    style,
    text,
    to,
  }
}

/** Wallpaper tokens, plus empty marker pairs the parser does not draw as formatted text. */
function parseLine(line: string): Span[] {
  const spans: Span[] = []
  for (const token of tokenizeInline(line)) {
    if (!isPlain(styleOf(token))) {
      const marker = (token.to - token.from - token.text.length) / 2
      spans.push(span(token.text, token.from, token.to, styleOf(token), marker))
      continue
    }
    let i = token.from
    while (i < token.to) {
      const empty = emptyPair(line, i)
      if (empty && i + empty.len <= token.to) {
        spans.push(span('', i, i + empty.len, empty.style, empty.len / 2))
        i += empty.len
        continue
      }
      let j = i + 1
      while (j < token.to && !(emptyPair(line, j) && j + emptyPair(line, j)!.len <= token.to)) {j++}
      spans.push(span(line.slice(i, j), i, j, PLAIN, 0))
      i = j
    }
  }
  if (spans.length === 0) {spans.push(span('', 0, 0, PLAIN, 0))}
  return spans
}

function spanAtCaret(spans: Span[], caret: number) {
  return spans.find((item) => !isPlain(item.style) && item.from < caret && caret < item.to) ?? null
}

function contentOffset(item: Span, caret: number) {
  if (caret <= item.contentFrom) {return 0}
  if (caret >= item.contentTo) {return item.text.length}
  return caret - item.contentFrom
}

function markerHost(spans: Span[], start: number, end: number) {
  return spans.find((item) => !isPlain(item.style) && item.from <= start && end <= item.to) ?? null
}

function piecesFrom(spans: Span[], start: number, end: number): Piece[] {
  const pieces: Piece[] = []
  for (const item of spans) {
    const from = Math.max(start, item.contentFrom)
    const to = Math.min(end, item.contentTo)
    if (from >= to) {
      pieces.push({ selected: null, style: item.style, text: item.text })
      continue
    }
    const a = from - item.contentFrom
    const b = to - item.contentFrom
    if (a > 0) {pieces.push({ text: item.text.slice(0, a), style: item.style, selected: null })}
    pieces.push({
      selected: [0, b - a],
      style: { ...item.style },
      text: item.text.slice(a, b),
    })
    if (b < item.text.length) {
      pieces.push({ selected: null, style: item.style, text: item.text.slice(b) })
    }
  }
  return pieces
}

function serialize(pieces: Piece[]) {
  const merged: Piece[] = []
  for (const piece of pieces) {
    const prev = merged.at(-1)
    const prevStyle = prev && JSON.stringify(prev.style)
    if (prev && !prev.isolate && !piece.isolate && prevStyle === JSON.stringify(piece.style)) {
      const shift = prev.text.length
      prev.text += piece.text
      if (piece.selected) {
        const [a, b] = piece.selected
        prev.selected = prev.selected
          ? [Math.min(prev.selected[0], a + shift), Math.max(prev.selected[1], b + shift)]
          : [a + shift, b + shift]
      }
      continue
    }
    merged.push({
      isolate: piece.isolate,
      selected: piece.selected,
      style: { ...piece.style },
      text: piece.text,
    })
  }

  let selEnd: number | null = null,
   selStart: number | null = null,
   text = ''
  for (const piece of merged) {
    const [open, close] = markers(piece.style)
    const contentAt = text.length + open.length
    text += open + piece.text + close
    if (!piece.selected) {continue}
    const a = contentAt + piece.selected[0]
    const b = contentAt + piece.selected[1]
    selStart = selStart === null ? a : Math.min(selStart, a)
    selEnd = selEnd === null ? b : Math.max(selEnd, b)
  }
  return { end: selEnd ?? 0, start: selStart ?? 0, text }
}

function insertEmpty(spans: Span[], caret: number, format: InlineFormat) {
  const style = withFormat(PLAIN, format, true)
  const pieces: Piece[] = []
  let inserted = false
  for (const item of spans) {
    if (!inserted && isPlain(item.style) && item.from <= caret && caret <= item.to) {
      const cut = caret - item.from
      if (cut > 0) {pieces.push({ text: item.text.slice(0, cut), style: PLAIN, selected: null })}
      pieces.push({ isolate: true, selected: [0, 0], style, text: '' })
      if (cut < item.text.length) {
        pieces.push({ selected: null, style: PLAIN, text: item.text.slice(cut) })
      }
      inserted = true
      continue
    }
    if (!inserted && item.from >= caret) {
      pieces.push({ isolate: true, selected: [0, 0], style, text: '' })
      inserted = true
    }
    pieces.push({ selected: null, style: item.style, text: item.text })
  }
  if (!inserted) {pieces.push({ text: '', style, selected: [0, 0], isolate: true })}
  return serialize(pieces)
}

function editCaret(line: string, spans: Span[], caret: number, format: InlineFormat) {
  const host = spanAtCaret(spans, caret)
  if (!host) {return insertEmpty(spans, caret, format)}
  if (!host.style[format] && breaks(format, host.text)) {
    return { end: caret, start: caret, text: line }
  }
  const offset = contentOffset(host, caret)
  const pieces = spans.map((item) => ({
    text: item.text,
    style: item === host ? withFormat(item.style, format, !item.style[format]) : item.style,
    selected: item === host ? ([offset, offset] as [number, number]) : null,
  }))
  return serialize(pieces)
}

function editLine(line: string, start: number, end: number, format: InlineFormat) {
  const spans = parseLine(line)
  if (start === end) {return editCaret(line, spans, start, format)}

  const pieces = piecesFrom(spans, start, end)
  const selected = pieces.filter((piece) => piece.selected)
  if (selected.length === 0) {
    const host = markerHost(spans, start, end)
    if (!host) {return { text: line, start, end }}
    const piecesForHost = spans.map((item) => ({
      text: item.text,
      style:
        item === host ? withFormat(item.style, format, !item.style[format]) : { ...item.style },
      selected: item === host ? ([0, item.text.length] as [number, number]) : null,
    }))
    if (!host.style[format] && breaks(format, host.text)) {return { text: line, start, end }}
    return serialize(piecesForHost)
  }

  const active = selected.every((piece) => piece.style[format])
  if (!active && selected.some((piece) => breaks(format, piece.text))) {
    return { end, start, text: line }
  }
  for (const piece of pieces) {
    if (!piece.selected) {continue}
    piece.style = withFormat(piece.style, format, !active)
  }
  return serialize(pieces)
}

function lineVerdict(
  line: string,
  start: number,
  end: number,
  format: InlineFormat,
): 'yes' | 'no' | 'skip' {
  const spans = parseLine(line)
  if (start === end) {
    const host = spanAtCaret(spans, start)
    if (!host) {return 'no'}
    return host.style[format] ? 'yes' : 'no'
  }
  const selected = piecesFrom(spans, start, end).filter((piece) => piece.selected)
  if (selected.length === 0) {
    const host = markerHost(spans, start, end)
    if (!host) {return 'skip'}
    return host.style[format] ? 'yes' : 'no'
  }
  return selected.every((piece) => piece.style[format]) ? 'yes' : 'no'
}

export function inlineFormatActive(
  text: string,
  start: number,
  end: number,
  format: InlineFormat,
): boolean {
  let covered = false
  for (const line of lineSpans(text)) {
    const local = localSelection(text, start, end, line)
    if (!local) {continue}
    const verdict = lineVerdict(line.line, local.start - line.start, local.end - line.start, format)
    if (verdict === 'no') {return false}
    if (verdict === 'yes') {covered = true}
  }
  return covered
}

export function toggleInlineFormat(
  { text, start, end }: NotesEdit,
  format: InlineFormat,
): NotesEdit {
  const nextLines: string[] = []
  let shift = 0,
   mappedStart = start,
   mappedEnd = end,
   placedStart = false

  for (const line of lineSpans(text)) {
    const local = localSelection(text, start, end, line)
    if (!local) {
      nextLines.push(line.line)
      continue
    }
    const edited = editLine(line.line, local.start - line.start, local.end - line.start, format)
    nextLines.push(edited.text)
    const at = line.start + shift
    if (!placedStart) {
      mappedStart = at + edited.start
      placedStart = true
    }
    mappedEnd = at + edited.end
    shift += edited.text.length - line.line.length
  }

  return { end: mappedEnd, start: mappedStart, text: nextLines.join('\n') }
}
