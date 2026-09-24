import { type Handle, type RemixNode } from 'remix/ui'

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
    <main>
      <InstallHint />
      {handle.props.children}
      <ToastViewport />
    </main>
  )
}
