// Minimal Markdown for Notes: two Heading levels, plus inline bold, italic,
// Bold+italic, code and strikethrough. Asterisks only; underscores are text.
export interface MarkdownSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
}

export interface InlineToken {
  text: string
  from: number
  to: number
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
}

const EMPHASIS_MARKER_LENGTH = 1,
 STRONG_EMPHASIS_MARKER_LENGTH = 3,
 STRONG_MARKER_LENGTH = 2

/** `body` for plain text; 1 for a `# ` Heading, 2 for a `## ` Heading. */
export type HeadingLevel = 'body' | 1 | 2

export interface MarkdownLine {
  heading: HeadingLevel
  segments: MarkdownSegment[]
}

const INLINE_MARKDOWN_PATTERN =
  /(\*\*\*[^*]+\*\*\*)|(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*]+\*)/g

export function parseMarkdownLines(text: string): MarkdownLine[] {
  return text.split('\n').map(parseLine)
}

// Only `# ` and `## ` (or a bare marker) make a Heading, so `#tag` and `###`
// Stay body text.
const HEADING_PATTERN = /^(#{1,2})(?: |$)/

function parseLine(line: string): MarkdownLine {
  const marker = HEADING_PATTERN.exec(line)
  if (!marker) {return { heading: 'body', segments: parseInline(line) }}
  const heading: HeadingLevel = marker[1].length === 1 ? 1 : 2
  return { heading, segments: parseInline(line.slice(marker[0].length)) }
}

/** Plain and formatted stretches of one line, in order, with source offsets. */
export function tokenizeInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let lastIndex = 0,
   match: RegExpExecArray | null

  INLINE_MARKDOWN_PATTERN.lastIndex = 0
  while ((match = INLINE_MARKDOWN_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ from: lastIndex, text: line.slice(lastIndex, match.index), to: match.index })
    }

    const token = match[0]
    const from = match.index
    const to = from + token.length
    if (token.startsWith('***')) {
      tokens.push({
        bold: true,
        from,
        italic: true,
        text: token.slice(STRONG_EMPHASIS_MARKER_LENGTH, -STRONG_EMPHASIS_MARKER_LENGTH),
        to,
      })
    } else if (token.startsWith('`')) {
      tokens.push({ code: true, from, text: token.slice(EMPHASIS_MARKER_LENGTH, -EMPHASIS_MARKER_LENGTH), to })
    } else if (token.startsWith('**')) {
      tokens.push({ bold: true, from, text: token.slice(STRONG_MARKER_LENGTH, -STRONG_MARKER_LENGTH), to })
    } else if (token.startsWith('~~')) {
      tokens.push({ from, strike: true, text: token.slice(STRONG_MARKER_LENGTH, -STRONG_MARKER_LENGTH), to })
    } else {
      tokens.push({ from, italic: true, text: token.slice(EMPHASIS_MARKER_LENGTH, -EMPHASIS_MARKER_LENGTH), to })
    }

    lastIndex = to
  }

  if (lastIndex < line.length) {
    tokens.push({ from: lastIndex, text: line.slice(lastIndex), to: line.length })
  }

  return tokens.length > 0 ? tokens : [{ from: 0, text: '', to: 0 }]
}

function parseInline(line: string): MarkdownSegment[] {
  return tokenizeInline(line).map((token) => {
    const segment: MarkdownSegment = { text: token.text }
    if (token.bold) {segment.bold = true}
    if (token.italic) {segment.italic = true}
    if (token.code) {segment.code = true}
    if (token.strike) {segment.strike = true}
    return segment
  })
}
