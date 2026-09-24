// Minimal Markdown for Notes: two Heading levels, plus inline bold, italic,
// bold+italic, code and strikethrough. Asterisks only; underscores are text.
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
// stay body text.
const HEADING_PATTERN = /^(#{1,2})(?: |$)/

function parseLine(line: string): MarkdownLine {
  let marker = HEADING_PATTERN.exec(line)
  if (!marker) return { heading: 'body', segments: parseInline(line) }
  let heading: HeadingLevel = marker[1].length === 1 ? 1 : 2
  return { heading, segments: parseInline(line.slice(marker[0].length)) }
}

/** Plain and formatted stretches of one line, in order, with source offsets. */
export function tokenizeInline(line: string): InlineToken[] {
  let tokens: InlineToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  INLINE_MARKDOWN_PATTERN.lastIndex = 0
  while ((match = INLINE_MARKDOWN_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), from: lastIndex, to: match.index })
    }

    let token = match[0]
    let from = match.index
    let to = from + token.length
    if (token.startsWith('***')) {
      tokens.push({ text: token.slice(3, -3), from, to, bold: true, italic: true })
    } else if (token.startsWith('`')) {
      tokens.push({ text: token.slice(1, -1), from, to, code: true })
    } else if (token.startsWith('**')) {
      tokens.push({ text: token.slice(2, -2), from, to, bold: true })
    } else if (token.startsWith('~~')) {
      tokens.push({ text: token.slice(2, -2), from, to, strike: true })
    } else {
      tokens.push({ text: token.slice(1, -1), from, to, italic: true })
    }

    lastIndex = to
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), from: lastIndex, to: line.length })
  }

  return tokens.length > 0 ? tokens : [{ text: '', from: 0, to: 0 }]
}

function parseInline(line: string): MarkdownSegment[] {
  return tokenizeInline(line).map((token) => {
    let segment: MarkdownSegment = { text: token.text }
    if (token.bold) segment.bold = true
    if (token.italic) segment.italic = true
    if (token.code) segment.code = true
    if (token.strike) segment.strike = true
    return segment
  })
}
