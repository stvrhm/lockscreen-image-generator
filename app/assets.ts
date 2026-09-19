import { createAssetServer } from 'remix/assets'
import { uiHmr } from 'remix/ui-hmr/assets'

const rootDir = process.cwd()
const nodeEnv = process.env.NODE_ENV ?? 'development'
const isDevelopment = nodeEnv === 'development'
const isHmr = Boolean(isDevelopment && process.env.REMIX_NODE_HMR)

export const assetServer = createAssetServer({
  basePath: '/assets',
  rootDir,
  // Client SPA: browser modules may import shared app code. Keep server-only
  // files out via denyFiles.
  allowFiles: ['app/**', 'node_modules/**'],
  allowPackages: ['remix'],
  denyFiles: [
    'app/**/*.server.*',
    'app/**/*.test.*',
    'app/router.ts',
    'app/actions/**',
    'app/middleware/**',
  ],
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

const entry = 'app/assets/entry.ts'

export const scriptEntry = await assetServer.getScriptEntry(entry)
