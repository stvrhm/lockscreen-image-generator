// Minimal Markdown for Notes: two Heading levels, plus inline bold, italic,
// bold+italic, code and strikethrough.
export interface MarkdownSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
}

/** `body` for plain text; 1 for a `# ` Heading, 2 for a `## ` Heading. */
export type HeadingLevel = 'body' | 1 | 2

export interface MarkdownLine {
  heading: HeadingLevel
  segments: MarkdownSegment[]
}

const INLINE_MARKDOWN_PATTERN =
  /(\*\*\*[^*]+\*\*\*)|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)|(_[^_]+_)/g

export function parseMarkdownLines(text: string): MarkdownLine[] {
  return text.split('\n').map(parseLine)
}

// Only `# ` and `## ` (or a bare marker) make a Heading, so `#tag` and `###`
// stay body text.
const HEADING_PATTERN = /^(#{1,2})(?: |$)/

function parseLine(line: string): MarkdownLine {
  let marker = HEADING_PATTERN.exec(line)
  if (!marker) return { heading: 'body', segments: parseInline(line) }
  let heading: HeadingLevel = marker[1].length === 1 ? 1 : 2
  return { heading, segments: parseInline(line.slice(marker[0].length)) }
}

function parseInline(line: string): MarkdownSegment[] {
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
