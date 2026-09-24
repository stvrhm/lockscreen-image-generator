import type { Handle, RemixNode } from 'remix/ui'

import { scriptEntry } from '../assets.ts'
import { strings } from '../strings.ts'
import { swBootScript } from './sw-boot.ts'
import { THEME_COLOR, baseCss } from './theme.ts'

export interface DocumentProps {
  head?: RemixNode
  title?: string
}

/**
 * The static shell served for every screen URL, in development and in the
 * production build alike.
 *
 * The body is deliberately empty. Screen content is owned entirely by the SPA
 * router, which renders into the document's top frame once the first route
 * resolves; pre-rendering a screen here is what previously let the shell's
 * Home markup appear alongside the screen the URL actually asked for.
 */
export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { head, title = strings.appName } = handle.props
    let { href, importMap, preloads } = scriptEntry

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="color-scheme" content="dark" />
          <meta name="theme-color" content={THEME_COLOR} />

          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content={strings.appShortName} />

          <title>{title}</title>
          <style>{baseCss}</style>
          {head}
          <script type="importmap" data-rmx-import-map>
            {JSON.stringify(importMap).replaceAll('<', '\\u003c')}
          </script>
          {preloads.map((preloadHref) => (
            <link key={preloadHref} rel="modulepreload" href={preloadHref} />
          ))}
          <script type="module" src={href}></script>

          {/* Lives in `head` so the SPA router owns an empty `body` outright. */}
          <script>{swBootScript}</script>
        </head>
        <body></body>
      </html>
    )
  }
}
