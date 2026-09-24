export type NotesEdit = { text: string; start: number; end: number }

type Level = 0 | 1 | 2

const MARKERS: Record<Level, string> = { 0: '', 1: '# ', 2: '## ' }

// A run of hashes followed by a space or the end of the line. Only `#` and
// `##` make a Heading; deeper runs are plain text but still get replaced when
// the line becomes a Heading, so `### Pixel` turns into `# Pixel`.
const HASH_PREFIX = /^#+(?: |$)/

function hashPrefix(line: string) {
  return HASH_PREFIX.exec(line)?.[0] ?? ''
}

function levelOf(prefix: string): Level {
  let hashes = prefix.trimEnd().length
  return hashes === 1 || hashes === 2 ? hashes : 0
}

/**
 * Cycles the Heading level of every line touched by the selection:
 * plain → `#` → `##` → plain. The first touched line decides the next level.
 * The selection keeps covering the same text; a position inside a replaced
 * marker moves to the start of the line's text.
 */
export function cycleHeading({ text, start, end }: NotesEdit): NotesEdit {
  let lines = text.split('\n')
  // A selection that ends right after a line break does not touch the next line.
  let lastTouched = end > start && text[end - 1] === '\n' ? end - 1 : end

  let next: Level | undefined
  let offset = 0
  let shift = 0
  let mapped = { start, end }
  let output: string[] = []

  for (let line of lines) {
    let lineStart = offset
    let lineEnd = lineStart + line.length
    offset = lineEnd + 1

    if (lineEnd < start || lineStart > lastTouched) {
      output.push(line)
      continue
    }

    let prefix = hashPrefix(line)
    let level = levelOf(prefix)
    next ??= ((level + 1) % 3) as Level
    // Turning lines plain only removes real Heading markers, never `###` text.
    let oldMarker = next === 0 && level === 0 ? '' : prefix
    let newMarker = MARKERS[next]
    output.push(newMarker + line.slice(oldMarker.length))

    let mapPosition = (position: number) => {
      if (position < lineStart || position > lineEnd) return undefined
      let column = Math.max(position - lineStart - oldMarker.length, 0)
      return lineStart + shift + newMarker.length + column
    }
    mapped.start = mapPosition(start) ?? mapped.start
    mapped.end = mapPosition(end) ?? mapped.end
    shift += newMarker.length - oldMarker.length
  }

  // Positions after the last touched line only move by the total shift.
  if (end > lastTouched) mapped.end = end + shift
  return { text: output.join('\n'), start: mapped.start, end: mapped.end }
}
