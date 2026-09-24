import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:net'
import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'
import { chromium, type Browser } from 'playwright'

import { strings } from '../app/strings.ts'

// `npm run hmr` serves the shell, then the browser HMR client imports
// `remix/multiple-import-maps-polyfill`. That module bare-imports
// `@remix-run/multiple-import-maps-polyfill`. If the document import map lacks
// that specifier, module evaluation throws and the body stays empty.
describe('hmr boot', () => {
  it(
    'renders a screen instead of staying blank',
    { timeout: 30_000 },
    async () => {
      // hmr.ts binds the proxy, the event channel, and the app server on three ports.
      let port = await freeHmrPort()
      let child = spawn(process.execPath, ['hmr.ts'], {
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PORT: String(port),
          HMR_PORT: String(port + 1),
          APP_PORT: String(port + 2),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      child.stdout?.on('data', (chunk) => {
        output += chunk.toString()
      })
      child.stderr?.on('data', (chunk) => {
        output += chunk.toString()
      })

      let browser: Browser | undefined
      try {
        browser = await chromium.launch()
        await waitForHttp(`http://127.0.0.1:${port}/`, child, () => output)
        let page = await browser.newPage()
        page.setDefaultTimeout(8_000)
        let pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
        try {
          await page.locator('h1', { hasText: strings.start.title }).waitFor()
        } catch (error) {
          let body = await page.locator('body').innerText()
          throw new Error(
            `${error instanceof Error ? error.message : error}\nbody=${JSON.stringify(body)}\npageErrors=${pageErrors.join('\n')}`,
          )
        }
        assert.deepEqual(pageErrors, [])
      } finally {
        await browser?.close()
        await stop(child)
      }
    },
  )
})

// Reserves three consecutive localhost ports, then releases them for hmr.ts.
async function freeHmrPort(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let port = 20000 + Math.floor(Math.random() * 20000)
    let servers = await Promise.all([listen(port), listen(port + 1), listen(port + 2)])
    await Promise.all(servers.filter((server) => server !== null).map(closeServer))
    if (servers.every((server) => server !== null)) return port
  }
  throw new Error('No free port for the HMR server')
}

function listen(port: number): Promise<Server | null> {
  return new Promise((resolve) => {
    let server = createServer()
    server.once('error', () => resolve(null))
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function waitForHttp(url: string, child: ChildProcess, readOutput: () => string) {
  let deadline = Date.now() + 15_000
  let lastError = 'not started'
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`hmr exited ${child.exitCode}\n${readOutput()}`)
    }
    try {
      let response = await fetch(url)
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`hmr did not respond (${lastError})\n${readOutput()}`)
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolve) => {
    let timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve(undefined)
    }, 2_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve(undefined)
    })
  })
}
