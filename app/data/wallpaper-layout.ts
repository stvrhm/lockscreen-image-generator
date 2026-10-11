// Lays out Notes on the Wallpaper. Pure: text measurement is injected, so the
// Canvas renderer and the editor preview share one layout and cannot drift.
import type { HeadingLevel, MarkdownLine, MarkdownSegment } from './markdown.ts'

const BASE_WIDTH = 1170,
  BASE_HEIGHT = 2532,
  HORIZONTAL_INSET = 94,
  VERTICAL_INSET = 202,
  LINE_HEIGHT = 1.35,
  // Body text size in pixels at the reference width, and the smallest it may be
  // on narrow exports. Headings are a multiple of the body size.
  BODY_SIZE = 72,
  MIN_BODY_SIZE = 28,
  HEADING_RATIO: Record<HeadingLevel, number> = { 1: 1.75, 2: 1.35, body: 1 },
  // Too-tall Notes shrink in 5% steps, but never below 35% of full size.
  BODY_WEIGHT = 600,
  BOLD_WEIGHT = 800,
  HEADING_WEIGHT = 800,
  MONO_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  SANS_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  SHRINK_FLOOR = 0.35,
  SHRINK_STEP = 0.05

/** Width in pixels of `text` drawn in the CSS `font`. */
export type MeasureText = (text: string, font: string) => number

/** A piece of a render line drawn in a single font. */
export interface WallpaperRun {
  text: string
  /** CSS font shorthand, including the size in export pixels. */
  font: string
  /** Left edge in export pixels. */
  x: number
  width: number
  code: boolean
  strike: boolean
}

/** One line as drawn, after wrapping. */
export interface WallpaperLine {
  runs: WallpaperRun[]
  fontSize: number
  weight: number
  /** Vertical centre in export pixels. */
  y: number
  height: number
}

export interface WallpaperLayout {
  lines: WallpaperLine[]
  /** How far all text was scaled down to fit; 1 means not at all. */
  shrink: number
}

export function layoutWallpaper(
  paragraphs: MarkdownLine[],
  size: { width: number; height: number },
  measure: MeasureText,
): WallpaperLayout {
  const { width, height } = size
  const scale = width / BASE_WIDTH
  const heightScale = height / BASE_HEIGHT
  const bodySize = Math.max(MIN_BODY_SIZE, Math.round(BODY_SIZE * scale))
  const maxLineWidth = width - Math.round(HORIZONTAL_INSET * scale)
  const availableHeight = height - Math.round(VERTICAL_INSET * heightScale)

  // Shrink every line by the same factor, one step at a time, so Headings stay
  // Proportionally larger than body text.
  let shrink = 1,
    lines = wrapParagraphs(paragraphs, bodySize, maxLineWidth, measure)
  for (let step = 1; totalHeight(lines) > availableHeight && shrink > SHRINK_FLOOR; step++) {
    shrink = Math.max(SHRINK_FLOOR, roundTo(1 - step * SHRINK_STEP, 2))
    lines = wrapParagraphs(paragraphs, bodySize * shrink, maxLineWidth, measure)
  }

  let top = height / 2 - totalHeight(lines) / 2,
    laidOut = lines.map((line) => {
      const lineWidth = line.tokens.reduce((sum, token) => sum + token.width, 0)
      let x = width / 2 - lineWidth / 2,
        runs = line.tokens.map((token) => {
          const run: WallpaperRun = {
            text: token.text,
            font: token.font,
            x,
            width: token.width,
            code: Boolean(token.code),
            strike: Boolean(token.strike),
          }
          x += token.width
          return run
        }),
        y = top + line.height / 2
      top += line.height
      return { fontSize: line.fontSize, height: line.height, runs, weight: line.weight, y }
    })

  return { lines: laidOut, shrink }
}

interface Token extends MarkdownSegment {
  font: string
  width: number
  isSpace: boolean
}

interface WrappedLine {
  tokens: Token[]
  fontSize: number
  weight: number
  height: number
}

function totalHeight(lines: WrappedLine[]): number {
  return lines.reduce((sum, line) => sum + line.height, 0)
}

function segmentFont(fontSize: number, weight: number, segment: MarkdownSegment): string {
  const style = segment.italic ? 'italic' : 'normal'
  const family = segment.code ? MONO_FAMILY : SANS_FAMILY
  return `${style} ${segment.bold ? BOLD_WEIGHT : weight} ${fontSize}px ${family}`
}

// Splits a line into atoms that wrap as a unit: runs of whitespace, and words,
// Which may span several formatted segments.
function tokenizeLine(
  segments: MarkdownSegment[],
  fontSize: number,
  weight: number,
  measure: MeasureText,
): Token[][] {
  const atoms: Token[][] = []
  let current: Token[] = []

  for (const segment of segments) {
    const font = segmentFont(fontSize, weight, segment)
    for (const wordPart of segment.text
      .split(/(\s+)/)
      .filter((segmentPart) => segmentPart.length > 0)) {
      const isSpace = /^\s+$/.test(wordPart)
      const token: Token = {
        ...segment,
        text: wordPart,
        font,
        width: measure(wordPart, font),
        isSpace,
      }
      if (isSpace) {
        if (current.length > 0) {
          atoms.push(current)
          current = []
        }
        atoms.push([token])
      } else {
        current.push(token)
      }
    }
  }
  if (current.length > 0) {
    atoms.push(current)
  }
  return atoms
}

function roundTo(value: number, decimals: number): number {
  const DECIMAL_BASE = 10
  const factor = DECIMAL_BASE ** decimals
  return Math.round(value * factor) / factor
}

function wrapParagraphs(
  paragraphs: MarkdownLine[],
  bodySize: number,
  maxWidth: number,
  measure: MeasureText,
): WrappedLine[] {
  const lines: WrappedLine[] = []

  for (const { heading, segments } of paragraphs) {
    const fontSize = roundTo(bodySize * HEADING_RATIO[heading], 1)
    const weight = heading === 'body' ? BODY_WEIGHT : HEADING_WEIGHT
    const height = fontSize * LINE_HEIGHT
    const push = (tokens: Token[]) => lines.push({ tokens, fontSize, weight, height })
    const atoms = tokenizeLine(segments, fontSize, weight, measure)
    if (atoms.length === 0) {
      push([])
      continue
    }

    let currentLine: Token[][] = [],
      currentWidth = 0

    for (const atom of atoms) {
      if (atom[0].isSpace && currentLine.length === 0) {
        continue
      }

      const atomWidth = atom.reduce((sum, token) => sum + token.width, 0)
      if (currentLine.length > 0 && currentWidth + atomWidth > maxWidth) {
        push(trimTrailingSpace(currentLine).flat())
        currentLine = []
        currentWidth = 0
        if (atom[0].isSpace) {
          continue
        }
      }

      currentLine.push(atom)
      currentWidth += atomWidth
    }

    push(trimTrailingSpace(currentLine).flat())
  }

  return lines
}

function trimTrailingSpace(atoms: Token[][]): Token[][] {
  if (atoms.at(-1)?.[0]?.isSpace) {
    return atoms.slice(0, -1)
  }
  return atoms
}
