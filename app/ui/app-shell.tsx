import { css } from 'remix/ui'

import { App } from '../assets/app.tsx'
import { InstallHint } from '../assets/install-hint.tsx'
import { Document } from './document.tsx'

export function AppShell() {
  return () => (
    <Document>
      <main mix={pageStyle}>
        <InstallHint />
        <App />
      </main>
    </Document>
  )
}

const pageStyle = css({
  minHeight: '100dvh',
  padding:
    'calc(env(safe-area-inset-top) + 24px) calc(env(safe-area-inset-right) + 20px) calc(env(safe-area-inset-bottom) + 24px) calc(env(safe-area-inset-left) + 20px)',
})
