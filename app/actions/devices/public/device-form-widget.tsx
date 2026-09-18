// Interactive form + live lock-screen preview + client-side PNG export.
// Hydrated as a single client entry so the preview can update as the user
// types without a page reload, per the component model's local-state pattern.
import {
  clientEntry,
  css,
  on,
  type Handle,
  type MixInput,
  type RemixNode,
  type SerializableProps,
} from 'remix/ui'

import type { Platform } from '../../../data/devices.ts'
import { parseMarkdownLines, type MarkdownSegment } from './markdown.ts'

// Fixed export resolution requested for the lock-screen wallpaper PNG.
const EXPORT_WIDTH = 1284
const EXPORT_HEIGHT = 2778

export interface DeviceFormWidgetProps extends SerializableProps {
  actionHref: string
  httpMethod: 'post' | 'put'
  label: string
  platform: Platform
  notes: string
  errors: Record<string, string>
}

export const DeviceFormWidget = clientEntry(
  import.meta.url,
  function DeviceFormWidget(handle: Handle<DeviceFormWidgetProps>) {
    let label = handle.props.label
    let platform: Platform = handle.props.platform
    let notes = handle.props.notes

    return () => {
      let { actionHref, httpMethod, errors } = handle.props
      let previewText = notes.trim() || label.trim() || 'Notes preview'

      return (
        <div mix={layoutStyle}>
          <form method="post" action={actionHref} mix={formStyle}>
            {httpMethod === 'put' && <input type="hidden" name="_method" value="put" />}

            <Field label="Device label" error={errors.label}>
              <input
                type="text"
                name="label"
                defaultValue={label}
                autoComplete="off"
                mix={[
                  inputStyle,
                  on('input', (event) => {
                    label = event.currentTarget.value
                    handle.update()
                  }),
                ]}
              />
            </Field>

            <Field label="Platform" error={errors.platform}>
              <select
                name="platform"
                defaultValue={platform}
                mix={[
                  inputStyle,
                  on('change', (event) => {
                    platform = event.currentTarget.value === 'android' ? 'android' : 'ios'
                    handle.update()
                  }),
                ]}
              >
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </Field>

            <Field label="Notes" hint="Supports **bold**, *italic*, `code`, ~~strike~~" error={errors.notes}>
              <textarea
                name="notes"
                rows={6}
                defaultValue={notes}
                mix={[
                  inputStyle,
                  textareaStyle,
                  on('input', (event) => {
                    notes = event.currentTarget.value
                    handle.update()
                  }),
                ]}
              />
            </Field>

            <div mix={actionsRowStyle}>
              <button type="submit" mix={primaryButtonStyle}>
                Save device
              </button>
              <button
                type="button"
                mix={[
                  secondaryButtonStyle,
                  on('click', () => downloadLockscreenPng(label, platform, notes)),
                ]}
              >
                Download PNG
              </button>
            </div>
          </form>

          <div mix={previewColumnStyle}>
            <p mix={previewLabelStyle}>Live preview</p>
            <PhonePreview platform={platform} text={previewText} />
          </div>
        </div>
      )
    }
  },
)

function Field(
  handle: Handle<{ label: string; hint?: string; error?: string; children?: RemixNode }>,
) {
  return () => {
    let { label, hint, error, children } = handle.props
    return (
      <label mix={fieldStyle}>
        <span mix={fieldLabelStyle}>{label}</span>
        {hint && <span mix={fieldHintStyle}>{hint}</span>}
        {children}
        {error && <span mix={fieldErrorStyle}>{error}</span>}
      </label>
    )
  }
}

function PhonePreview(handle: Handle<{ platform: Platform; text: string }>) {
  return () => {
    let { platform, text } = handle.props
    let lines = parseMarkdownLines(text)
    return (
      <div mix={phoneFrameStyle}>
        <div mix={phoneScreenStyle}>
          {platform === 'ios' ? <div mix={notchStyle} /> : <div mix={punchHoleStyle} />}
          <div mix={previewTextStyle}>
            {lines.map((segments, lineIndex) => (
              <div key={lineIndex}>
                {segments.every((segment) => segment.text === '') ? (
                  ' '
                ) : (
                  segments.map((segment, segmentIndex) => (
                    <MarkdownSpan key={segmentIndex} segment={segment} />
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}

function MarkdownSpan(handle: Handle<{ segment: MarkdownSegment }>) {
  return () => {
    let { segment } = handle.props
    let classes: MixInput[] = []
    if (segment.bold) classes.push(markdownBoldStyle)
    if (segment.italic) classes.push(markdownItalicStyle)
    if (segment.strike) classes.push(markdownStrikeStyle)
    if (segment.code) classes.push(markdownCodeStyle)

    return <span mix={classes}>{segment.text}</span>
  }
}

function downloadLockscreenPng(label: string, platform: Platform, notes: string) {
  let canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT

  let ctx = canvas.getContext('2d')
  if (!ctx) return

  // Plain background fill — no phone frame chrome in the exported image.
  ctx.fillStyle = '#15171b'
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)

  let text = notes.trim() || label.trim() || ''
  if (text) {
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 6

    let fontSize = 64
    let maxLineWidth = EXPORT_WIDTH - 200
    let lines = wrapMarkdownText(ctx, parseMarkdownLines(text), fontSize, maxLineWidth)
    let lineHeight = fontSize * 1.35

    // Shrink the font until the whole block fits within the canvas height.
    while (lines.length * lineHeight > EXPORT_HEIGHT - 200 && fontSize > 28) {
      fontSize -= 4
      lines = wrapMarkdownText(ctx, parseMarkdownLines(text), fontSize, maxLineWidth)
      lineHeight = fontSize * 1.35
    }

    let startY = EXPORT_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2
    for (let i = 0; i < lines.length; i++) {
      drawMarkdownLine(ctx, lines[i], fontSize, EXPORT_WIDTH / 2, startY + i * lineHeight)
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return
    let url = URL.createObjectURL(blob)
    let a = document.createElement('a')
    a.href = url
    a.download = `${slugify(label) || 'device'}-lockscreen.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, 'image/png')
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

// Group a markdown line's segments into atoms — runs of non-space tokens that
// must stay together, and single-space tokens that are valid break points —
// so word-wrap can operate on styled spans instead of plain strings.
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

function measureAtomWidth(ctx: CanvasRenderingContext2D, atom: MarkdownToken[], fontSize: number): number {
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

const layoutStyle = css({
  display: 'flex',
  gap: '40px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
})

const formStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  flex: '1 1 320px',
  minWidth: '280px',
})

const fieldStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
})

const fieldLabelStyle = css({
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
})

const fieldHintStyle = css({
  fontSize: '12px',
  color: 'var(--text-tertiary, #888)',
})

const fieldErrorStyle = css({
  fontSize: '12px',
  color: '#e5484d',
})

const inputStyle = css({
  font: 'inherit',
  fontSize: '14px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--surface-4, #ccc)',
  background: 'var(--surface-3, #fff)',
  color: 'var(--text-primary)',
})

const textareaStyle = css({
  resize: 'vertical',
  minHeight: '120px',
  fontFamily: 'inherit',
})

const actionsRowStyle = css({
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
})

const primaryButtonStyle = css({
  appearance: 'none',
  border: 0,
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'var(--brand-blue, #2dacf9)',
  color: '#fff',
})

const secondaryButtonStyle = css({
  appearance: 'none',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid var(--brand-blue, #2dacf9)',
  color: 'var(--brand-blue, #2dacf9)',
})

const previewColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  flex: '0 0 auto',
})

const previewLabelStyle = css({
  margin: 0,
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-tertiary, #888)',
})

const phoneFrameStyle = css({
  width: '231px',
  height: '500px',
  padding: '10px',
  borderRadius: '48px',
  background: '#0b0c0e',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
})

const phoneScreenStyle = css({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '38px',
  overflow: 'hidden',
  background: '#15171b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const notchStyle = css({
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90px',
  height: '22px',
  borderRadius: '0 0 14px 14px',
  background: '#000',
})

const punchHoleStyle = css({
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  background: '#000',
})

const previewTextStyle = css({
  padding: '32px 20px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  textAlign: 'center',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
})

const markdownBoldStyle = css({ fontWeight: 800 })
const markdownItalicStyle = css({ fontStyle: 'italic' })
const markdownStrikeStyle = css({ textDecoration: 'line-through' })
const markdownCodeStyle = css({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontWeight: 400,
  background: 'rgba(255, 255, 255, 0.16)',
  borderRadius: '4px',
  padding: '1px 5px',
})
