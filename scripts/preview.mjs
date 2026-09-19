// Serves the static dist/ build for local + on-device offline testing.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100

function dirname(p) {
  return p.slice(0, p.lastIndexOf('/'))
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.tsx': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
}

async function tryFile(path) {
  try {
    const s = await stat(path)
    if (s.isFile()) return path
  } catch {}
  return null
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
    let filePath = join(DIST, rel)

    let resolved = await tryFile(filePath)
    if (!resolved && (rel === '/' || rel.endsWith('/'))) {
      resolved = await tryFile(join(filePath, 'index.html'))
    }
    if (!resolved && !extname(rel)) {
      resolved = await tryFile(join(DIST, 'index.html'))
    }
    if (!resolved) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('Not Found')
      return
    }

    const body = await readFile(resolved)
    res.writeHead(200, {
      'content-type': TYPES[extname(resolved)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end('Internal Server Error')
    console.error(error)
  }
})

server.listen(PORT, () => {
  console.log(`Preview serving dist/ on http://localhost:${PORT}`)
})
