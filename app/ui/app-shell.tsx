import { css, type Handle } from 'remix/ui'

import { App } from '../assets/app.tsx'
import { InstallHint } from '../assets/install-hint.tsx'
import { Document } from './document.tsx'

export type AppRoute = 'start' | 'new' | 'continue' | 'browse' | 'edit'

export interface AppShellProps {
  route: AppRoute
  deviceId?: string
}

export function AppShell(handle: Handle<AppShellProps>) {
  return () => (
    <Document>
      <main mix={pageStyle}>
        <InstallHint />
        <App route={handle.props.route} deviceId={handle.props.deviceId} />
      </main>
    </Document>
  )
}

const pageStyle = css({
  minHeight: '100dvh',
  padding:
    'calc(env(safe-area-inset-top) + 24px) calc(env(safe-area-inset-right) + 20px) calc(env(safe-area-inset-bottom) + 24px) calc(env(safe-area-inset-left) + 20px)',
})
