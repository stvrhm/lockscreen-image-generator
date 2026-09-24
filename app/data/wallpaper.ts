import type { ExportEncoding } from './devices.ts'
import { parseMarkdownLines } from './markdown.ts'
import { layoutWallpaper, type MeasureText, type WallpaperLine } from './wallpaper-layout.ts'

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

    let layout = layoutWallpaper(
      parseMarkdownLines(text),
      { width, height },
      measureWithCanvas(ctx),
    )
    for (let line of layout.lines) drawLine(ctx, line)
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
): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
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
    if ((error as Error).name === 'AbortError') return 'cancelled'
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
  let { fontSize, y } = line
  for (let run of line.runs) {
    ctx.font = run.font

    if (run.code) {
      let padding = fontSize * 0.12
      ctx.save()
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
      ctx.beginPath()
      ctx.roundRect(
        run.x - padding,
        y - fontSize * 0.62,
        run.width + padding * 2,
        fontSize * 1.24,
        6,
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
      ctx.fillRect(run.x, y - 1, run.width, Math.max(2, fontSize * 0.04))
      ctx.restore()
    }
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
