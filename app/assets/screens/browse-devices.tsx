import { css, navigate, on, ref, type Handle } from 'remix/component'

import { flow } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import {
  deleteDevice,
  duplicateDevice,
  listDevices,
  saveDevice,
  type Device,
} from '../../data/devices.ts'
import {
  DeviceFileDimensionError,
  downloadDeviceFile,
  readDeviceFile,
} from '../../data/device-file.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { measureHostExportSize } from '../../data/host.ts'
import { PhonePreview } from '../editor/phone-preview.tsx'
import { Button } from '../../ui/button.tsx'
import { toast } from '../../ui/toast.tsx'
import {
  mutedStyle,
  pageStyle,
  headingStyle,
  headerRowStyle,
  actionsRowStyle,
} from '../../ui/screen-styles.ts'

export function BrowseDevices(handle: Handle<{ devices: Device[] }>) {
  let devices = handle.props.devices
  let importInput: HTMLInputElement | null = null

  async function refresh() {
    devices = await listDevices()
    handle.update()
  }

  async function onDuplicate(device: Device) {
    let copy = await duplicateDevice(device)
    navigate(routes.screens.editDevice.href({ id: copy.id }))
  }

  async function onDelete(device: Device) {
    if (!window.confirm(strings.browse.confirmDelete)) return
    await deleteDevice(device.id)
    await refresh()
  }

  async function onImport(file: File) {
    try {
      let device = await readDeviceFile(file)
      await saveDevice(device)
      await refresh()
      toast({ title: strings.browse.imported, variant: 'success' })
    } catch (error) {
      toast({
        title: strings.browse.importFailed,
        description:
          error instanceof DeviceFileDimensionError
            ? strings.editor.dimensionIssues[error.issue]
            : error instanceof Error
              ? error.message
              : undefined,
        variant: 'error',
      })
    }
  }

  return () => {
    return (
      <div mix={pageStyle}>
        <header mix={headerRowStyle}>
          <Button href={routes.screens.home.href()} variant="ghost">
            {strings.browse.back}
          </Button>
          <h1 mix={headingStyle}>{strings.browse.title}</h1>
          <Button variant="secondary" onClick={() => importInput?.click()}>
            {strings.browse.import}
          </Button>
          <input
            type="file"
            accept="application/json,.json"
            aria-label={strings.browse.import}
            style={{ display: 'none' }}
            mix={[
              ref((node) => {
                importInput = node as HTMLInputElement | null
              }),
              on('change', (event) => {
                let input = event.currentTarget
                let file = input.files?.[0]
                input.value = ''
                if (file) void onImport(file)
              }),
            ]}
          />
        </header>
        {devices.length === 0 ? (
          <p mix={mutedStyle}>{strings.browse.empty}</p>
        ) : (
          <ul mix={listStyle}>
            {devices.map((device) => (
              <li key={device.id} mix={listItemStyle}>
                <div mix={listMainStyle}>
                  <strong>{device.label || 'Untitled'}</strong>
                  <span mix={mutedStyle}>
                    {device.platform.toUpperCase()} · {new Date(device.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    width: '67px',
                    height: '145px',
                    overflow: 'hidden',
                    flex: '0 0 auto',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ transform: 'scale(.3)', transformOrigin: 'top left' }}>
                    <PhonePreview
                      platform={device.platform}
                      text={device.notes.trim() || device.label || 'Notes preview'}
                      size={
                        device.exportSizeMode === 'custom'
                          ? { width: device.customWidth, height: device.customHeight }
                          : measureHostExportSize()
                      }
                    />
                  </div>
                </div>
                <div mix={actionsRowStyle}>
                  <Button variant="secondary" onClick={() => downloadDeviceFile(device)}>
                    {strings.browse.export}
                  </Button>
                  <Button
                    href={routes.screens.editDevice.href({ id: device.id })}
                    variant="secondary"
                  >
                    {strings.browse.edit}
                  </Button>
                  <Button variant="secondary" onClick={() => void onDuplicate(device)}>
                    {strings.browse.duplicate}
                  </Button>
                  <Button variant="destructive" onClick={() => void onDelete(device)}>
                    {strings.browse.delete}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
}

const listStyle = [flow({ flowSpace: theme.space.md }), css({ listStyle: 'none', padding: 0 })]

const listItemStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '18px',
  background: 'rgba(17, 17, 19, 0.78)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
})

const listMainStyle = flow({ flowSpace: theme.space.xs })
