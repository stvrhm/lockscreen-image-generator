import { css, type Handle } from 'remix/ui'

import type { Platform } from '../../data/devices.ts'
import { routes } from '../../routes.ts'
import { Document } from '../document.tsx'
import { DeviceFormWidget } from './public/device-form-widget.tsx'

export interface DeviceFormPageProps {
  mode: 'create' | 'edit'
  actionHref: string
  values?: { label?: string; platform?: string; notes?: string }
  errors?: Record<string, string>
}

export function DeviceFormPage(handle: Handle<DeviceFormPageProps>) {
  return () => {
    let { mode, actionHref, values, errors } = handle.props
    let label = values?.label ?? ''
    let platform: Platform = values?.platform === 'android' ? 'android' : 'ios'
    let notes = values?.notes ?? ''
    let heading = mode === 'create' ? 'Add device' : `Edit ${label || 'device'}`

    return (
      <Document title={`${heading} – Test Device Lockscreens`}>
        <main mix={pageStyle}>
          <div mix={containerStyle}>
            <a href={routes.home.href()} mix={backLinkStyle}>
              &larr; All devices
            </a>
            <h1 mix={titleStyle}>{heading}</h1>
            <DeviceFormWidget
              actionHref={actionHref}
              httpMethod={mode === 'create' ? 'post' : 'put'}
              label={label}
              platform={platform}
              notes={notes}
              errors={errors ?? {}}
            />
          </div>
        </main>
      </Document>
    )
  }
}

const pageStyle = css({
  margin: 0,
  minHeight: '100vh',
  padding: '48px 24px',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  maxWidth: '900px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const backLinkStyle = css({
  color: 'var(--text-tertiary)',
  textDecoration: 'none',
  fontSize: '13px',
  '&:hover': { textDecoration: 'underline' },
})

const titleStyle = css({
  margin: '0 0 8px',
  fontSize: '24px',
})
