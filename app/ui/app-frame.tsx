import { css, type Handle, type RemixNode } from 'remix/ui'

import { InstallHint } from '../assets/install-hint.tsx'
import { ToastViewport } from './toast.tsx'

export interface AppFrameProps {
  children?: RemixNode
}

/**
 * Chrome shared by every screen, applied by the SPA render middleware in
 * `app/assets/browser-router.ts`. It owns the document body: the static shell
 * ships an empty body and this replaces it once the first route resolves.
 */
export function AppFrame(handle: Handle<AppFrameProps>) {
  return () => (
    <main mix={pageStyle}>
      <InstallHint />
      {handle.props.children}
      <ToastViewport />
    </main>
  )
}

const pageStyle = css({
  minHeight: '100dvh',
  padding:
    'calc(env(safe-area-inset-top) + 24px) calc(env(safe-area-inset-right) + 20px) calc(env(safe-area-inset-bottom) + 24px) calc(env(safe-area-inset-left) + 20px)',
})
