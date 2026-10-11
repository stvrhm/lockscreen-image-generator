export interface NotesEdit {
  text: string
  start: number
  end: number
}

export type HeadingLevel = 0 | 1 | 2

const MARKERS: Record<HeadingLevel, string> = { 0: '', 1: '# ', 2: '## ' },
  // A run of hashes followed by a space or the end of the line. Only `#` and
  // `##` make a Heading; deeper runs are plain text but still get replaced when
  // the line becomes a Heading, so `### Pixel` turns into `# Pixel`.
  HASH_PREFIX = /^#+(?: |$)/

interface LineSpan {
  line: string
  start: number
  end: number
}

function hashPrefix(line: string) {
  return HASH_PREFIX.exec(line)?.[0] ?? ''
}

function levelOf(prefix: string): HeadingLevel {
  const hashes = prefix.trimEnd().length
  return hashes === 1 || hashes === 2 ? (hashes as HeadingLevel) : 0
}

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

/** A selection that ends on a line break does not include the next line. */
function lastTouched(text: string, start: number, end: number) {
  return end > start && text[end - 1] === '\n' ? end - 1 : end
}

function eachTouchedLine(
  text: string,
  start: number,
  end: number,
  visit: (line: LineSpan, index: number) => void,
) {
  const touchedEnd = lastTouched(text, start, end)
  const lines = lineSpans(text)
  lines.forEach((line, index) => {
    if (line.end < start || line.start > touchedEnd) {
      return
    }
    visit(line, index)
  })
}

export function headingPressed(text: string, start: number, end: number, level: 1 | 2): boolean {
  const levels: HeadingLevel[] = []
  eachTouchedLine(text, start, end, (line) => {
    levels.push(levelOf(hashPrefix(line.line)))
  })
  return levels.length > 0 && levels.every((current) => current === level)
}

/**
 * Sets every line the selection touches to `level`, or clears that Heading
 * when every touched line is already there. The selection keeps covering the
 * same text; a position inside a replaced marker moves to the start of the
 * line's text.
 */
export function setHeading({ text, start, end }: NotesEdit, level: 1 | 2): NotesEdit {
  const clearing = headingPressed(text, start, end, level)
  const next: HeadingLevel = clearing ? 0 : level
  const lines = lineSpans(text)
  const touchedEnd = lastTouched(text, start, end)
  let shift = 0,
    mapped = { end, start },
    output: string[] = []

  for (const line of lines) {
    if (line.end < start || line.start > touchedEnd) {
      output.push(line.line)
      continue
    }

    const prefix = hashPrefix(line.line)
    const current = levelOf(prefix)
    // Clearing only removes a real Heading marker, never a `###` run.
    const oldMarker = next === 0 && current === 0 ? '' : prefix
    const newMarker = MARKERS[next]
    output.push(newMarker + line.line.slice(oldMarker.length))

    const mapPosition = (position: number) => {
      if (position < line.start || position > line.end) return undefined
      let column = Math.max(position - line.start - oldMarker.length, 0)
      return line.start + shift + newMarker.length + column
    }
    mapped.start = mapPosition(start) ?? mapped.start
    mapped.end = mapPosition(end) ?? mapped.end
    shift += newMarker.length - oldMarker.length
  }

  if (end > touchedEnd) {
    mapped.end = end + shift
  }
  return { end: mapped.end, start: mapped.start, text: output.join('\n') }
}
