import { css, type Handle } from 'remix/ui'

import { theme } from '../../ui/theme.ts'
import { type Device } from '../../data/devices.ts'
import { strings } from '../../strings.ts'

export function ExportSummary(
  handle: Handle<{
    device: Device
    size: { width: number; height: number }
    automatic: boolean
  }>,
) {
  return () => {
    let { device, size, automatic } = handle.props
    let exportStatus =
      device.exportSizeMode === 'auto'
        ? automatic
          ? strings.editor.detectedAutomatically
          : strings.editor.autoSize
        : strings.editor.customized
    return (
      <div mix={exportSummaryStyle}>
        <strong>
          {device.platform === 'ios' ? 'iOS' : 'Android'} · {size.width} × {size.height} px
        </strong>
        <span>
          {device.encoding === 'quality' ? 'PNG' : 'JPEG'} · {exportStatus}
        </span>
      </div>
    )
  }
}

const exportSummaryStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.space['3xs'],
  width: '100%',
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
  lineHeight: 1.35,
  textAlign: 'center',
  strong: { color: 'var(--text)', fontWeight: 600 },
})
