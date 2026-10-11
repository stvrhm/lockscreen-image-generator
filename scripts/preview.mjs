// Serves the static dist/ build for local + on-device offline testing.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const DEFAULT_PORT = 44_100
const INTERNAL_ERROR_STATUS = 500
const NOT_FOUND_STATUS = 404
const OK_STATUS = 200
const PORT_ENV_RADIX = 10

const DIST = join(dirname(import.meta.filename), '..', 'dist'),
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT, PORT_ENV_RADIX) : DEFAULT_PORT

function dirname(p) {
  return p.slice(0, p.lastIndexOf('/'))
}

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ts': 'application/javascript; charset=utf-8',
  '.tsx': 'application/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

async function tryFile(path) {
  try {
    const s = await stat(path)
    if (s.isFile()) {
      return path
    }
  } catch {}
  return null
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'),
      rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
    const filePath = join(DIST, rel)

    let resolved = await tryFile(filePath)
    if (!resolved && (rel === '/' || rel.endsWith('/'))) {
      resolved = await tryFile(join(filePath, 'index.html'))
    }
    if (!resolved && !extname(rel)) {
      resolved = await tryFile(join(DIST, 'index.html'))
    }
    if (!resolved) {
      res.writeHead(NOT_FOUND_STATUS, { 'content-type': 'text/plain' })
      res.end('Not Found')
      return
    }

    const body = await readFile(resolved)
    res.writeHead(OK_STATUS, {
      'cache-control': 'no-cache',
      'content-type': TYPES[extname(resolved)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(INTERNAL_ERROR_STATUS, { 'content-type': 'text/plain' })
    res.end('Internal Server Error')
    console.error(error)
  }
})

server.listen(PORT, () => {
  console.log(`Preview serving dist/ on http://localhost:${PORT}`)
})
