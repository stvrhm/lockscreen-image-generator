import { css, type Handle } from 'remix/ui'

import type { Device } from '../data/devices.ts'
import { routes } from '../routes.ts'
import { Document } from './document.tsx'
import { DeleteDeviceButton } from './public/delete-device-button.tsx'

export interface HomePageProps {
  devices: Device[]
  query: string
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    let { devices, query } = handle.props

    return (
      <Document title="Test Device Lockscreens">
        <main mix={pageStyle}>
          <div mix={containerStyle}>
            <header mix={headerStyle}>
              <div>
                <h1 mix={titleStyle}>Device lockscreens</h1>
                <p mix={subtitleStyle}>{devices.length} device(s)</p>
              </div>
              <a href={routes.devices.new.href()} mix={primaryLinkStyle}>
                + Add device
              </a>
            </header>

            <form method="get" action={routes.home.href()} mix={searchFormStyle}>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by label…"
                mix={searchInputStyle}
              />
              <button type="submit" mix={secondaryButtonStyle}>
                Search
              </button>
              {query && (
                <a href={routes.home.href()} mix={clearLinkStyle}>
                  Clear
                </a>
              )}
            </form>

            {devices.length === 0 ? (
              <p mix={emptyStyle}>
                {query ? `No devices match "${query}".` : 'No devices yet. Add your first one.'}
              </p>
            ) : (
              <table mix={tableStyle}>
                <thead>
                  <tr>
                    <th mix={thStyle}>Label</th>
                    <th mix={thStyle}>Platform</th>
                    <th mix={thStyle}>Notes</th>
                    <th mix={thStyle}>Updated</th>
                    <th mix={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td mix={tdStyle}>{device.label}</td>
                      <td mix={tdStyle}>
                        <span mix={badgeStyle}>{device.platform}</span>
                      </td>
                      <td mix={[tdStyle, notesCellStyle]}>{truncate(device.notes, 80)}</td>
                      <td mix={tdStyle}>{formatDate(device.updatedAt)}</td>
                      <td mix={[tdStyle, actionsCellStyle]}>
                        <a href={routes.devices.edit.href({ deviceId: device.id })} mix={linkStyle}>
                          Edit
                        </a>
                        <DeleteDeviceButton
                          actionHref={routes.devices.destroy.href({ deviceId: device.id })}
                          label={device.label}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </Document>
    )
  }
}

function truncate(value: string, max: number): string {
  let singleLine = value.replace(/\s+/g, ' ').trim()
  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine
}

function formatDate(iso: string): string {
  let date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const pageStyle = css({
  margin: 0,
  minHeight: '100vh',
  padding: '48px 24px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  '--surface-3': '#f0f4f7',
  '--surface-4': '#dee2e6',
  '--text-primary': '#313539',
  '--text-tertiary': '#767b80',
  '--brand-blue': '#2dacf9',
  '@media (prefers-color-scheme: dark)': {
    '--surface-3': '#24272b',
    '--surface-4': '#3a3e42',
    '--text-primary': '#dee2e6',
    '--text-tertiary': '#9aa0a6',
  },
  color: 'var(--text-primary)',
})

const containerStyle = css({
  maxWidth: '1000px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
})

const headerStyle = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
})

const titleStyle = css({ margin: '0 0 4px', fontSize: '26px' })
const subtitleStyle = css({ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px' })

const primaryLinkStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '10px 18px',
  borderRadius: '8px',
  background: 'var(--brand-blue)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '14px',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
})

const searchFormStyle = css({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
})

const searchInputStyle = css({
  flex: '0 1 320px',
  font: 'inherit',
  fontSize: '14px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--surface-4)',
  background: 'var(--surface-3)',
  color: 'var(--text-primary)',
})

const secondaryButtonStyle = css({
  appearance: 'none',
  borderRadius: '8px',
  border: '1px solid var(--surface-4)',
  background: 'var(--surface-3)',
  color: 'var(--text-primary)',
  padding: '8px 14px',
  fontSize: '14px',
  cursor: 'pointer',
})

const clearLinkStyle = css({
  fontSize: '13px',
  color: 'var(--text-tertiary)',
})

const emptyStyle = css({
  color: 'var(--text-tertiary)',
  fontSize: '14px',
})

const tableStyle = css({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
})

const thStyle = css({
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid var(--surface-4)',
  color: 'var(--text-tertiary)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const tdStyle = css({
  padding: '10px 12px',
  borderBottom: '1px solid var(--surface-4)',
  verticalAlign: 'middle',
})

const notesCellStyle = css({
  color: 'var(--text-tertiary)',
  maxWidth: '360px',
})

const actionsCellStyle = css({
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  whiteSpace: 'nowrap',
})

const linkStyle = css({
  color: 'var(--brand-blue)',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 600,
  '&:hover': { textDecoration: 'underline' },
})

const badgeStyle = css({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  background: 'var(--surface-3)',
  fontSize: '12px',
  textTransform: 'capitalize',
})
