// Lays out Notes on the Wallpaper. Pure: text measurement is injected, so the
// canvas renderer and the editor preview share one layout and cannot drift.
import type { HeadingLevel, MarkdownLine, MarkdownSegment } from './markdown.ts'

const BASE_WIDTH = 1170
const BASE_HEIGHT = 2532
const LINE_HEIGHT = 1.35

// Body text size in pixels at the reference width, and the smallest it may be
// on narrow exports. Headings are a multiple of the body size.
const BODY_SIZE = 72
const MIN_BODY_SIZE = 28
const HEADING_RATIO: Record<HeadingLevel, number> = { body: 1, 1: 1.75, 2: 1.35 }

// Too-tall Notes shrink in 5% steps, but never below 35% of full size.
const SHRINK_STEP = 0.05
const SHRINK_FLOOR = 0.35

const BODY_WEIGHT = 600
const BOLD_WEIGHT = 800
const HEADING_WEIGHT = 800
const SANS_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const MONO_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

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
  let { width, height } = size
  let scale = width / BASE_WIDTH
  let heightScale = height / BASE_HEIGHT
  let bodySize = Math.max(MIN_BODY_SIZE, Math.round(BODY_SIZE * scale))
  let maxLineWidth = width - Math.round(94 * scale)
  let availableHeight = height - Math.round(202 * heightScale)

  // Shrink every line by the same factor, one step at a time, so Headings stay
  // proportionally larger than body text.
  let shrink = 1
  let lines = wrapParagraphs(paragraphs, bodySize, maxLineWidth, measure)
  for (let step = 1; totalHeight(lines) > availableHeight && shrink > SHRINK_FLOOR; step++) {
    shrink = Math.max(SHRINK_FLOOR, roundTo(1 - step * SHRINK_STEP, 2))
    lines = wrapParagraphs(paragraphs, bodySize * shrink, maxLineWidth, measure)
  }

  let top = height / 2 - totalHeight(lines) / 2
  let laidOut = lines.map((line) => {
    let lineWidth = line.tokens.reduce((sum, token) => sum + token.width, 0)
    let x = width / 2 - lineWidth / 2
    let runs = line.tokens.map((token) => {
      let run: WallpaperRun = {
        text: token.text,
        font: token.font,
        x,
        width: token.width,
        code: Boolean(token.code),
        strike: Boolean(token.strike),
      }
      x += token.width
      return run
    })
    let y = top + line.height / 2
    top += line.height
    return { runs, fontSize: line.fontSize, weight: line.weight, y, height: line.height }
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
  let style = segment.italic ? 'italic' : 'normal'
  let family = segment.code ? MONO_FAMILY : SANS_FAMILY
  return `${style} ${segment.bold ? BOLD_WEIGHT : weight} ${fontSize}px ${family}`
}

// Splits a line into atoms that wrap as a unit: runs of whitespace, and words,
// which may span several formatted segments.
function tokenizeLine(
  segments: MarkdownSegment[],
  fontSize: number,
  weight: number,
  measure: MeasureText,
): Token[][] {
  let atoms: Token[][] = []
  let current: Token[] = []

  for (let segment of segments) {
    let font = segmentFont(fontSize, weight, segment)
    for (let part of segment.text.split(/(\s+)/).filter((part) => part.length > 0)) {
      let isSpace = /^\s+$/.test(part)
      let token: Token = { ...segment, text: part, font, width: measure(part, font), isSpace }
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
  if (current.length > 0) atoms.push(current)
  return atoms
}

function roundTo(value: number, decimals: number): number {
  let factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function wrapParagraphs(
  paragraphs: MarkdownLine[],
  bodySize: number,
  maxWidth: number,
  measure: MeasureText,
): WrappedLine[] {
  let lines: WrappedLine[] = []

  for (let { heading, segments } of paragraphs) {
    let fontSize = roundTo(bodySize * HEADING_RATIO[heading], 1)
    let weight = heading === 'body' ? BODY_WEIGHT : HEADING_WEIGHT
    let height = fontSize * LINE_HEIGHT
    let push = (tokens: Token[]) => lines.push({ tokens, fontSize, weight, height })
    let atoms = tokenizeLine(segments, fontSize, weight, measure)
    if (atoms.length === 0) {
      push([])
      continue
    }

    let currentLine: Token[][] = []
    let currentWidth = 0

    for (let atom of atoms) {
      if (atom[0].isSpace && currentLine.length === 0) continue

      let atomWidth = atom.reduce((sum, token) => sum + token.width, 0)
      if (currentLine.length > 0 && currentWidth + atomWidth > maxWidth) {
        push(trimTrailingSpace(currentLine).flat())
        currentLine = []
        currentWidth = 0
        if (atom[0].isSpace) continue
      }

      currentLine.push(atom)
      currentWidth += atomWidth
    }

    push(trimTrailingSpace(currentLine).flat())
  }

  return lines
}

function trimTrailingSpace(atoms: Token[][]): Token[][] {
  if (atoms.length > 0 && atoms[atoms.length - 1][0].isSpace) return atoms.slice(0, -1)
  return atoms
}
