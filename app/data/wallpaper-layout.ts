// Lays out Notes on the Wallpaper. Pure: text measurement is injected, so the
// canvas renderer and the editor preview share one layout and cannot drift.
import type { MarkdownSegment } from './markdown.ts'

const BASE_WIDTH = 1170
const BASE_HEIGHT = 2532
const LINE_HEIGHT = 1.35
const SHRINK_STEP = 4

const BODY_WEIGHT = 600
const BOLD_WEIGHT = 800
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
  paragraphs: MarkdownSegment[][],
  size: { width: number; height: number },
  measure: MeasureText,
): WallpaperLayout {
  let { width, height } = size
  let scale = width / BASE_WIDTH
  let heightScale = height / BASE_HEIGHT
  let baseFontSize = Math.max(28, Math.round(58 * scale))
  let minFontSize = Math.max(18, Math.round(26 * scale))
  let maxLineWidth = width - Math.round(94 * scale)
  let availableHeight = height - Math.round(202 * heightScale)

  let fontSize = baseFontSize
  let lines = wrapParagraphs(paragraphs, fontSize, maxLineWidth, measure)
  while (totalHeight(lines) > availableHeight && fontSize > minFontSize) {
    fontSize -= SHRINK_STEP
    lines = wrapParagraphs(paragraphs, fontSize, maxLineWidth, measure)
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

  return { lines: laidOut, shrink: fontSize / baseFontSize }
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

function wrapParagraphs(
  paragraphs: MarkdownSegment[][],
  fontSize: number,
  maxWidth: number,
  measure: MeasureText,
): WrappedLine[] {
  let weight = BODY_WEIGHT
  let height = fontSize * LINE_HEIGHT
  let lines: WrappedLine[] = []
  let push = (tokens: Token[]) => lines.push({ tokens, fontSize, weight, height })

  for (let segments of paragraphs) {
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
