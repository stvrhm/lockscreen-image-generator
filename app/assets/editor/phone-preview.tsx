import { css, type Handle, type MixInput } from 'remix/ui'

import { theme } from '../../ui/theme.ts'
import { type Platform } from '../../data/devices.ts'
import { parseMarkdownLines, type MarkdownSegment } from '../../data/markdown.ts'

export function PhonePreview(handle: Handle<{ platform: Platform; text: string }>) {
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
                {segments.every((segment) => segment.text === '')
                  ? ' '
                  : segments.map((segment, segmentIndex) => (
                      <MarkdownSpan key={segmentIndex} segment={segment} />
                    ))}
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

const phoneFrameStyle = css({
  width: '224px',
  height: '484px',
  padding: '10px',
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  containerType: 'inline-size',
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
  padding: '8.7cqi 1.7cqi',
  color: '#fff',
  fontSize: '4.96cqi',
  lineHeight: 1.35,
  fontWeight: theme.fontWeight.semibold,
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
