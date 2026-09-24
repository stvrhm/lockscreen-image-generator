import { css, navigate, type Handle } from 'remix/ui'

import { flow } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import { deleteDevice, duplicateDevice, listDevices, type Device } from '../../data/devices.ts'
import { strings } from '../../strings.ts'
import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import {
  mutedStyle,
  pageStyle,
  headingStyle,
  headerRowStyle,
  actionsRowStyle,
} from '../../ui/screen-styles.ts'

export function BrowseDevices(handle: Handle<{ devices: Device[] }>) {
  let devices = handle.props.devices

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

  return () => {
    return (
      <div mix={pageStyle}>
        <header mix={headerRowStyle}>
          <Button href={routes.screens.home.href()} variant="ghost">
            {strings.browse.back}
          </Button>
          <h1 mix={headingStyle}>{strings.browse.title}</h1>
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
                <div mix={actionsRowStyle}>
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
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
})

const listMainStyle = flow({ flowSpace: theme.space.xs })
