import { type Handle, css } from 'remix/component'

import { theme } from '../../ui/theme.ts'
import type { Device } from '../../data/devices.ts'
import { strings } from '../../strings.ts'

export function ExportSummary(
  handle: Handle<{
    device: Device
    size: { width: number; height: number }
    automatic: boolean
  }>,
) {
  return () => {
    const { device, size, automatic } = handle.props
    const exportStatus =
      device.exportSizeMode === 'auto'
        ? automatic
          ? strings.editor.detectedAutomatically
          : strings.editor.autoSize
        : strings.editor.customized
    return (
      <p mix={exportSummaryStyle}>
        <strong>
          {device.platform === 'ios' ? 'iOS' : 'Android'} · {size.width} × {size.height} px
        </strong>
        <span>
          {device.encoding === 'quality' ? 'PNG' : 'JPEG'} · {exportStatus}
        </span>
        {device.exportSizeMode === 'auto' && <span>{strings.editor.exportSizeHelp}</span>}
      </p>
    )
  }
}

const exportSummaryStyle = css({
  color: 'var(--text-muted)',
  display: 'flex',
  flexDirection: 'column',
  fontSize: theme.fontSize.small,
  gap: theme.space['3xs'],
  lineHeight: 1.35,
  strong: { color: 'var(--text)', fontWeight: 600 },
  textAlign: 'center',
  width: '100%',
})
