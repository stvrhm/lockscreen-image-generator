import type { ExportEncoding } from './devices.ts'
import { parseMarkdownLines, type MarkdownSegment } from './markdown.ts'

const JPEG_QUALITY = 0.92

export interface WallpaperOptions {
  label: string
  notes: string
  width: number
  height: number
  encoding: ExportEncoding
}

export async function renderWallpaperBlob(options: WallpaperOptions): Promise<Blob | null> {
  let { label, notes, width, height, encoding } = options
  let canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  let ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#15171b'
  ctx.fillRect(0, 0, width, height)

  let text = notes.trim() || label.trim() || ''
  if (text) {
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 6

    let fontSize = Math.max(28, Math.round(width * 0.05))
    let maxLineWidth = width - Math.round(width * 0.16)
    let lines = wrapMarkdownText(ctx, parseMarkdownLines(text), fontSize, maxLineWidth)
    let lineHeight = fontSize * 1.35
    let minFont = Math.max(18, Math.round(width * 0.022))

    while (lines.length * lineHeight > height - Math.round(height * 0.08) && fontSize > minFont) {
      fontSize -= 4
      lines = wrapMarkdownText(ctx, parseMarkdownLines(text), fontSize, maxLineWidth)
      lineHeight = fontSize * 1.35
    }

    let startY = height / 2 - ((lines.length - 1) * lineHeight) / 2
    for (let i = 0; i < lines.length; i++) {
      drawMarkdownLine(ctx, lines[i], fontSize, width / 2, startY + i * lineHeight)
    }
  }

  let mime = encoding === 'size' ? 'image/jpeg' : 'image/png'
  let quality = encoding === 'size' ? JPEG_QUALITY : undefined

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

export function wallpaperFilename(label: string, encoding: ExportEncoding): string {
  let slug = slugify(label) || 'device'
  let ext = encoding === 'size' ? 'jpg' : 'png'
  return `${slug}-lockscreen.${ext}`
}

export async function downloadWallpaper(options: WallpaperOptions): Promise<boolean> {
  let blob = await renderWallpaperBlob(options)
  if (!blob) return false
  let url = URL.createObjectURL(blob)
  let a = document.createElement('a')
  a.href = url
  a.download = wallpaperFilename(options.label, options.encoding)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}

export async function shareWallpaper(
  options: WallpaperOptions,
): Promise<'shared' | 'unsupported' | 'failed'> {
  let blob = await renderWallpaperBlob(options)
  if (!blob) return 'failed'

  let file = new File([blob], wallpaperFilename(options.label, options.encoding), {
    type: blob.type,
  })

  let nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }

  if (!nav.share) return 'unsupported'

  try {
    if (nav.canShare && !nav.canShare({ files: [file] })) {
      return 'unsupported'
    }
    await nav.share({ files: [file], title: options.label || 'Lockscreen' })
    return 'shared'
  } catch (error) {
    if ((error as Error).name === 'AbortError') return 'shared'
    return 'failed'
  }
}

interface MarkdownToken extends MarkdownSegment {
  isSpace: boolean
}

function markdownFont(fontSize: number, segment: MarkdownSegment): string {
  let weight = segment.bold ? 800 : 600
  let style = segment.italic ? 'italic' : 'normal'
  let family = segment.code
    ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  return `${style} ${weight} ${fontSize}px ${family}`
}

function tokenizeMarkdownLine(segments: MarkdownSegment[]): MarkdownToken[][] {
  let atoms: MarkdownToken[][] = []
  let current: MarkdownToken[] = []

  for (let segment of segments) {
    for (let part of segment.text.split(/(\s+)/).filter((part) => part.length > 0)) {
      let isSpace = /^\s+$/.test(part)
      let token: MarkdownToken = { ...segment, text: part, isSpace }
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

function measureAtomWidth(
  ctx: CanvasRenderingContext2D,
  atom: MarkdownToken[],
  fontSize: number,
): number {
  let width = 0
  for (let token of atom) {
    ctx.font = markdownFont(fontSize, token)
    width += ctx.measureText(token.text).width
  }
  return width
}

function wrapMarkdownText(
  ctx: CanvasRenderingContext2D,
  paragraphLines: MarkdownSegment[][],
  fontSize: number,
  maxWidth: number,
): MarkdownToken[][] {
  let renderLines: MarkdownToken[][] = []

  for (let segments of paragraphLines) {
    let atoms = tokenizeMarkdownLine(segments)
    if (atoms.length === 0) {
      renderLines.push([])
      continue
    }

    let currentLine: MarkdownToken[][] = []
    let currentWidth = 0

    for (let atom of atoms) {
      if (atom[0].isSpace && currentLine.length === 0) continue

      let atomWidth = measureAtomWidth(ctx, atom, fontSize)
      if (currentLine.length > 0 && currentWidth + atomWidth > maxWidth) {
        renderLines.push(trimTrailingSpace(currentLine).flat())
        currentLine = []
        currentWidth = 0
        if (atom[0].isSpace) continue
      }

      currentLine.push(atom)
      currentWidth += atomWidth
    }

    renderLines.push(trimTrailingSpace(currentLine).flat())
  }

  return renderLines
}

function trimTrailingSpace(atoms: MarkdownToken[][]): MarkdownToken[][] {
  if (atoms.length > 0 && atoms[atoms.length - 1][0].isSpace) return atoms.slice(0, -1)
  return atoms
}

function drawMarkdownLine(
  ctx: CanvasRenderingContext2D,
  tokens: MarkdownToken[],
  fontSize: number,
  centerX: number,
  y: number,
) {
  let totalWidth = tokens.reduce((sum, token) => {
    ctx.font = markdownFont(fontSize, token)
    return sum + ctx.measureText(token.text).width
  }, 0)

  let x = centerX - totalWidth / 2
  for (let token of tokens) {
    ctx.font = markdownFont(fontSize, token)
    let width = ctx.measureText(token.text).width

    if (token.code) {
      let padding = fontSize * 0.12
      ctx.save()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      ctx.beginPath()
      ctx.roundRect(x - padding, y - fontSize * 0.62, width + padding * 2, fontSize * 1.24, 6)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.restore()
    }

    ctx.fillText(token.text, x, y)
    if (token.strike) {
      ctx.save()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y - 1, width, Math.max(2, fontSize * 0.04))
      ctx.restore()
    }

    x += width
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
