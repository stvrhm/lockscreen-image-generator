import { type Handle, css } from 'remix/component'
import * as popover from '@remix-run/ui/popover'

import type { Platform } from '../../data/devices.ts'
import { Button } from '../../ui/button.tsx'
import { strings } from '../../strings.ts'
import { theme } from '../../ui/theme.ts'
import { parseMarkdownLines } from '../../data/markdown.ts'
import { measureWithCanvas } from '../../data/wallpaper.ts'
import {
  type MeasureText,
  type WallpaperLine,
  type WallpaperRun,
  layoutWallpaper,
} from '../../data/wallpaper-layout.ts'

const FRAME_WIDTH = 224,
 FRAME_HEIGHT = 484,
 FRAME_PADDING = 10,
 SCREEN_WIDTH = FRAME_WIDTH - FRAME_PADDING * 2,
 SCREEN_HEIGHT = FRAME_HEIGHT - FRAME_PADDING * 2

// Lays the text out at export size, exactly as the Wallpaper does, then scales
// The whole Wallpaper down to fit the preview screen.
// oxlint-disable jsx-a11y/prefer-tag-over-role -- The warning surface is controlled by the popover API, not native dialog state.
export function PhonePreview(
  handle: Handle<{ platform: Platform; text: string; size: { width: number; height: number } }>,
) {
  let measure: MeasureText | undefined,
   open = false

  return () => {
    const { platform, text, size } = handle.props
    measure ??= measureWithCanvas(document.createElement('canvas').getContext('2d')!)
    const layout = layoutWallpaper(parseMarkdownLines(text), size, measure)
    const scale = Math.min(SCREEN_WIDTH / size.width, SCREEN_HEIGHT / size.height)
    return (
      <popover.Context>
        <div mix={phoneFrameStyle}>
          <div mix={phoneScreenStyle}>
            <div
              mix={wallpaperStyle}
              style={{
                height: `${size.height}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                width: `${size.width}px`,
              }}
            >
              {layout.lines.map((line, lineIndex) =>
                line.runs.map((run, runIndex) => (
                  <PreviewRun key={`${lineIndex}-${runIndex}`} line={line} run={run} />
                )),
              )}
            </div>
            {platform === 'ios' ? <div mix={notchStyle} /> : <div mix={punchHoleStyle} />}
            {layout.shrink < 1 && (
              <>
                <Button
                  variant="toolbar"
                  size="icon"
                  label={strings.editor.textReduced}
                  mix={[warningStyle, popover.anchor({ offset: 8, placement: 'top-end' })]}
                  onClick={() => {
                    open = !open
                    handle.update()
                  }}
                >
                  ⚠
                </Button>
                <div
                  role="dialog"
                  aria-label={strings.editor.textReduced}
                  mix={[
                    warningPanelStyle,
                    popover.surface({
                      onHide: () => {
                        open = false
                        handle.update()
                      },
                      open,
                    }),
                  ]}
                >
                  {strings.editor.textReducedHelp}
                </div>
              </>
            )}
          </div>
        </div>
      </popover.Context>
    )
  }
}
// oxlint-enable jsx-a11y/prefer-tag-over-role

// Mirrors how the canvas renderer draws a run, in export pixels.
function PreviewRun(handle: Handle<{ line: WallpaperLine; run: WallpaperRun }>) {
  return () => {
    const { line, run } = handle.props
    const { fontSize, y } = line
    const padding = fontSize * 0.12
    return (
      <span
        mix={[runStyle, run.code && codeRunStyle, run.strike && strikeRunStyle]}
        style={{
          font: run.font,
          left: `${run.x}px`,
          lineHeight: `${fontSize}px`,
          top: `${y}px`,
          width: `${run.width}px`,
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
  background: '#0b0c0e',
  borderRadius: '48px',
  boxShadow: '0 24px 50px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  height: `${FRAME_HEIGHT}px`,
  padding: `${FRAME_PADDING}px`,
  width: `${FRAME_WIDTH}px`,
}),

 phoneScreenStyle = css({
  background: '#15171b',
  borderRadius: '38px',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
}),

 warningStyle = css({
  background: 'rgba(180, 83, 9, .9)',
  borderRadius: '50%',
  color: '#fff',
  height: '28px',
  minHeight: '28px',
  position: 'absolute',
  right: '12px',
  top: '12px',
  width: '28px',
  zIndex: 2,
}),

 warningPanelStyle = css({
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  borderRadius: theme.radius.md,
  boxShadow: 'var(--shadow-soft)',
  color: 'var(--text)',
  fontSize: theme.fontSize.small,
  inset: 'auto',
  lineHeight: 1.45,
  margin: 0,
  padding: theme.space.sm,
  position: 'fixed',
  width: 'min(18rem, calc(100vw - 32px))',
}),

 notchStyle = css({
  background: '#000',
  borderRadius: '0 0 14px 14px',
  height: '22px',
  left: '50%',
  position: 'absolute',
  top: 0,
  transform: 'translateX(-50%)',
  width: '90px',
}),

 punchHoleStyle = css({
  background: '#000',
  borderRadius: '50%',
  height: '14px',
  left: '50%',
  position: 'absolute',
  top: '10px',
  transform: 'translateX(-50%)',
  width: '14px',
}),

 wallpaperStyle = css({
  color: '#fff',
  left: '50%',
  position: 'absolute',
  textShadow: '0 6px 28px rgba(0, 0, 0, 0.6)',
  top: '50%',
}),

 runStyle = css({
  boxSizing: 'content-box',
  position: 'absolute',
  transform: 'translateY(-50%)',
  whiteSpace: 'pre',
}),

 codeRunStyle = css({
  background: 'rgba(255, 255, 255, 0.16)',
  borderRadius: '6px',
}),

 strikeRunStyle = css({ textDecoration: 'line-through' })
