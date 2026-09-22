import { createAssetServer } from 'remix/assets'
import { uiHmr } from 'remix/ui-hmr/assets'

const rootDir = process.cwd()
const nodeEnv = process.env.NODE_ENV ?? 'development'
const isDevelopment = nodeEnv === 'development'
const isHmr = Boolean(isDevelopment && process.env.REMIX_NODE_HMR)

export const assetServer = createAssetServer({
  basePath: '/assets',
  rootDir,
  // Client SPA: name the browser-reachable trees explicitly. `app/actions/**`,
  // `app/router.ts`, and this file are server-only and simply absent from the
  // allow list rather than recovered afterwards by deny rules.
  allowFiles: ['app/assets/**', 'app/data/**', 'app/ui/**', 'app/routes.ts', 'app/strings.ts'],
  allowPackages: ['remix', 'bowser'],
  denyFiles: ['app/**/*.server.*', 'app/**/*.test.*', 'app/assets.ts'],
  sourceMaps: isDevelopment ? 'external' : undefined,
  minify: !isDevelopment,
  watch: isDevelopment,
  hmr: isHmr
    ? {
        channel: async () => (await import('remix/node-hmr/runtime')).createBrowserHmrChannel(),
        moduleImporter: 'remix/multiple-import-maps-polyfill',
      }
    : undefined,
  scripts: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
    loaders: isHmr ? [uiHmr()] : undefined,
  },
})

const entry = 'app/assets/entry.tsx'

export const scriptEntry = await assetServer.getScriptEntry(entry)
