export type NotesEdit = { text: string; start: number; end: number }

export type HeadingLevel = 0 | 1 | 2

const MARKERS: Record<HeadingLevel, string> = { 0: '', 1: '# ', 2: '## ' }

// A run of hashes followed by a space or the end of the line. Only `#` and
// `##` make a Heading; deeper runs are plain text but still get replaced when
// the line becomes a Heading, so `### Pixel` turns into `# Pixel`.
const HASH_PREFIX = /^#+(?: |$)/

type LineSpan = { line: string; start: number; end: number }

function hashPrefix(line: string) {
  return HASH_PREFIX.exec(line)?.[0] ?? ''
}

function levelOf(prefix: string): HeadingLevel {
  let hashes = prefix.trimEnd().length
  return hashes === 1 || hashes === 2 ? (hashes as HeadingLevel) : 0
}

function lineSpans(text: string): LineSpan[] {
  let lines: LineSpan[] = []
  let start = 0
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === '\n') {
      lines.push({ line: text.slice(start, i), start, end: i })
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
  let touchedEnd = lastTouched(text, start, end)
  let lines = lineSpans(text)
  lines.forEach((line, index) => {
    if (line.end < start || line.start > touchedEnd) return
    visit(line, index)
  })
}

export function headingPressed(text: string, start: number, end: number, level: 1 | 2): boolean {
  let levels: HeadingLevel[] = []
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
  let clearing = headingPressed(text, start, end, level)
  let next: HeadingLevel = clearing ? 0 : level
  let lines = lineSpans(text)
  let touchedEnd = lastTouched(text, start, end)
  let shift = 0
  let mapped = { start, end }
  let output: string[] = []

  for (let line of lines) {
    if (line.end < start || line.start > touchedEnd) {
      output.push(line.line)
      continue
    }

    let prefix = hashPrefix(line.line)
    let current = levelOf(prefix)
    // Clearing only removes a real Heading marker, never a `###` run.
    let oldMarker = next === 0 && current === 0 ? '' : prefix
    let newMarker = MARKERS[next]
    output.push(newMarker + line.line.slice(oldMarker.length))

    let mapPosition = (position: number) => {
      if (position < line.start || position > line.end) return undefined
      let column = Math.max(position - line.start - oldMarker.length, 0)
      return line.start + shift + newMarker.length + column
    }
    mapped.start = mapPosition(start) ?? mapped.start
    mapped.end = mapPosition(end) ?? mapped.end
    shift += newMarker.length - oldMarker.length
  }

  if (end > touchedEnd) mapped.end = end + shift
  return { text: output.join('\n'), start: mapped.start, end: mapped.end }
}
