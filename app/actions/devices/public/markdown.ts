// Minimal inline markdown: bold, italic, bold+italic, code, strikethrough.
// No nesting beyond bold+italic, no block-level syntax — just enough to
// style a short lock-screen note.
export interface MarkdownSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
}

const INLINE_MARKDOWN_PATTERN =
  /(\*\*\*[^*]+\*\*\*)|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)|(_[^_]+_)/g

export function parseMarkdownLines(text: string): MarkdownSegment[][] {
  return text.split('\n').map(parseMarkdownLine)
}

function parseMarkdownLine(line: string): MarkdownSegment[] {
  let segments: MarkdownSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  INLINE_MARKDOWN_PATTERN.lastIndex = 0
  while ((match = INLINE_MARKDOWN_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) })
    }

    let token = match[0]
    if (token.startsWith('***')) {
      segments.push({ text: token.slice(3, -3), bold: true, italic: true })
    } else if (token.startsWith('`')) {
      segments.push({ text: token.slice(1, -1), code: true })
    } else if (token.startsWith('**') || token.startsWith('__')) {
      segments.push({ text: token.slice(2, -2), bold: true })
    } else if (token.startsWith('~~')) {
      segments.push({ text: token.slice(2, -2), strike: true })
    } else {
      segments.push({ text: token.slice(1, -1), italic: true })
    }

    lastIndex = INLINE_MARKDOWN_PATTERN.lastIndex
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ text: '' }]
}
