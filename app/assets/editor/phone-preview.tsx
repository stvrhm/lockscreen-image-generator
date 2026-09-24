import { css, type Handle } from 'remix/ui'

import { type Platform } from '../../data/devices.ts'
import { parseMarkdownLines } from '../../data/markdown.ts'
import { measureWithCanvas } from '../../data/wallpaper.ts'
import {
  layoutWallpaper,
  type MeasureText,
  type WallpaperLine,
  type WallpaperRun,
} from '../../data/wallpaper-layout.ts'

const FRAME_WIDTH = 224
const FRAME_HEIGHT = 484
const FRAME_PADDING = 10
const SCREEN_WIDTH = FRAME_WIDTH - FRAME_PADDING * 2
const SCREEN_HEIGHT = FRAME_HEIGHT - FRAME_PADDING * 2

// Lays the text out at export size, exactly as the Wallpaper does, then scales
// the whole Wallpaper down to fit the preview screen.
export function PhonePreview(
  handle: Handle<{ platform: Platform; text: string; size: { width: number; height: number } }>,
) {
  let measure: MeasureText | undefined

  return () => {
    let { platform, text, size } = handle.props
    measure ??= measureWithCanvas(document.createElement('canvas').getContext('2d')!)
    let layout = layoutWallpaper(parseMarkdownLines(text), size, measure)
    let scale = Math.min(SCREEN_WIDTH / size.width, SCREEN_HEIGHT / size.height)
    return (
      <div mix={phoneFrameStyle}>
        <div mix={phoneScreenStyle}>
          <div
            mix={wallpaperStyle}
            style={{
              width: `${size.width}px`,
              height: `${size.height}px`,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            {layout.lines.map((line, lineIndex) =>
              line.runs.map((run, runIndex) => (
                <PreviewRun key={`${lineIndex}-${runIndex}`} line={line} run={run} />
              )),
            )}
          </div>
          {platform === 'ios' ? <div mix={notchStyle} /> : <div mix={punchHoleStyle} />}
        </div>
      </div>
    )
  }
}

// Mirrors how the canvas renderer draws a run, in export pixels.
function PreviewRun(handle: Handle<{ line: WallpaperLine; run: WallpaperRun }>) {
  return () => {
    let { line, run } = handle.props
    let { fontSize, y } = line
    let padding = fontSize * 0.12
    return (
      <span
        mix={[runStyle, run.code && codeRunStyle, run.strike && strikeRunStyle]}
        style={{
          left: `${run.x}px`,
          top: `${y}px`,
          width: `${run.width}px`,
          font: run.font,
          lineHeight: `${fontSize}px`,
          ...(run.code && {
            margin: `0 ${-padding}px`,
            padding: `${padding}px`,
          }),
        }}
      >
        {run.text}
      </span>
    )
  }
}

const phoneFrameStyle = css({
  width: `${FRAME_WIDTH}px`,
  height: `${FRAME_HEIGHT}px`,
  padding: `${FRAME_PADDING}px`,
  borderRadius: '48px',
  background: '#0b0c0e',
  boxShadow: '0 24px 50px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.08)',
})

const phoneScreenStyle = css({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '38px',
  overflow: 'hidden',
  background: '#15171b',
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

const wallpaperStyle = css({
  position: 'absolute',
  top: '50%',
  left: '50%',
  color: '#fff',
  textShadow: '0 6px 28px rgba(0, 0, 0, 0.6)',
})

const runStyle = css({
  position: 'absolute',
  transform: 'translateY(-50%)',
  whiteSpace: 'pre',
  boxSizing: 'content-box',
})

const codeRunStyle = css({
  background: 'rgba(255, 255, 255, 0.16)',
  borderRadius: '6px',
})

const strikeRunStyle = css({ textDecoration: 'line-through' })
