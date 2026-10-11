import type { ExportEncoding } from './devices.ts'
import { parseMarkdownLines } from './markdown.ts'
import { type MeasureText, type WallpaperLine, layoutWallpaper } from './wallpaper-layout.ts'

const JPEG_QUALITY = 0.92
const CODE_BACKGROUND_HEIGHT_RATIO = 1.24,
 CODE_BACKGROUND_RADIUS = 6,
 CODE_BACKGROUND_RADIUS_RATIO = 0.62,
 CODE_PADDING_RATIO = 0.12,
 STRIKE_LINE_HEIGHT_RATIO = 0.04,
 STRIKE_LINE_MINIMUM_HEIGHT = 2,
 STRIKE_LINE_OFFSET = 1

export interface WallpaperOptions {
  label: string
  notes: string
  width: number
  height: number
  encoding: ExportEncoding
}

export async function renderWallpaperBlob(options: WallpaperOptions): Promise<Blob | null> {
  const { label, notes, width, height, encoding } = options
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {return null}

  ctx.fillStyle = '#15171b'
  ctx.fillRect(0, 0, width, height)

  const text = notes.trim() || label.trim() || ''
  if (text) {
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 6

    const layout = layoutWallpaper(
      parseMarkdownLines(text),
      { width, height },
      measureWithCanvas(ctx),
    )
    for (const line of layout.lines) {drawLine(ctx, line)}
  }

  const mime = encoding === 'size' ? 'image/jpeg' : 'image/png'
  const quality = encoding === 'size' ? JPEG_QUALITY : undefined

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

export function wallpaperFilename(label: string, encoding: ExportEncoding): string {
  const slug = slugify(label) || 'device'
  const ext = encoding === 'size' ? 'jpg' : 'png'
  return `${slug}-lockscreen.${ext}`
}

export async function downloadWallpaper(options: WallpaperOptions): Promise<boolean> {
  const blob = await renderWallpaperBlob(options)
  if (!blob) {return false}
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = wallpaperFilename(options.label, options.encoding)
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}

export async function shareWallpaper(
  options: WallpaperOptions,
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  const blob = await renderWallpaperBlob(options)
  if (!blob) {return 'failed'}

  const file = new File([blob], wallpaperFilename(options.label, options.encoding), {
    type: blob.type,
  })

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }

  if (!nav.share) {return 'unsupported'}

  try {
    if (nav.canShare && !nav.canShare({ files: [file] })) {
      return 'unsupported'
    }
    await nav.share({ files: [file], title: options.label || 'Lockscreen' })
    return 'shared'
  } catch (error) {
    if ((error as Error).name === 'AbortError') {return 'cancelled'}
    return 'failed'
  }
}

/** Measures text the way the Wallpaper is drawn: on a 2D canvas. */
export function measureWithCanvas(ctx: CanvasRenderingContext2D): MeasureText {
  return (text, font) => {
    ctx.font = font
    return ctx.measureText(text).width
  }
}

function drawLine(ctx: CanvasRenderingContext2D, line: WallpaperLine) {
  const { fontSize, y } = line
  for (const run of line.runs) {
    ctx.font = run.font

    if (run.code) {
      const padding = fontSize * CODE_PADDING_RATIO
      ctx.save()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      ctx.beginPath()
      ctx.roundRect(
        run.x - padding,
        y - fontSize * CODE_BACKGROUND_RADIUS_RATIO,
        run.width + padding * 2,
        fontSize * CODE_BACKGROUND_HEIGHT_RATIO,
        CODE_BACKGROUND_RADIUS,
      )
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.restore()
    }

    ctx.fillText(run.text, run.x, y)
    if (run.strike) {
      ctx.save()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(
        run.x,
        y - STRIKE_LINE_OFFSET,
        run.width,
        Math.max(STRIKE_LINE_MINIMUM_HEIGHT, fontSize * STRIKE_LINE_HEIGHT_RATIO),
      )
      ctx.restore()
    }
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
}
