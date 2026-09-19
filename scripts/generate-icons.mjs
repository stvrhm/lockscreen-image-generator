// Generates PWA icons: dark lockscreen phone silhouette on charcoal.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const BG = [0x15, 0x17, 0x1b]
const PHONE = [0x5e, 0xb8, 0xff]
const SCREEN = [0x2a, 0x30, 0x38]

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

function roundedRectSD(px, py, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const hx = (x1 - x0) / 2 - r
  const hy = (y1 - y0) / 2 - r
  const qx = Math.abs(px - cx) - hx
  const qy = Math.abs(py - cy) - hy
  const dx = Math.max(qx, 0)
  const dy = Math.max(qy, 0)
  return Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - r
}

function renderIcon(size, motifScale) {
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = BG[0]
    buf[i * 4 + 1] = BG[1]
    buf[i * 4 + 2] = BG[2]
    buf[i * 4 + 3] = 0xff
  }

  const band = size * motifScale
  const left = (size - band * 0.55) / 2
  const right = left + band * 0.55
  const top = (size - band) / 2
  const bottom = top + band
  const radius = band * 0.12
  const inset = band * 0.06

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const body = clamp01(0.5 - roundedRectSD(px, py, left, top, right, bottom, radius))
      const screen = clamp01(
        0.5 -
          roundedRectSD(
            px,
            py,
            left + inset,
            top + inset * 1.6,
            right - inset,
            bottom - inset * 1.2,
            radius * 0.7,
          ),
      )
      if (body <= 0 && screen <= 0) continue
      const i = (y * size + x) * 4
      let r = BG[0]
      let g = BG[1]
      let b = BG[2]
      if (body > 0) {
        r = Math.round(r + (PHONE[0] - r) * body)
        g = Math.round(g + (PHONE[1] - g) * body)
        b = Math.round(b + (PHONE[2] - b) * body)
      }
      if (screen > 0) {
        r = Math.round(r + (SCREEN[0] - r) * screen)
        g = Math.round(g + (SCREEN[1] - g) * screen)
        b = Math.round(b + (SCREEN[2] - b) * screen)
      }
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
    }
  }
  return buf
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT, { recursive: true })

const targets = [
  { name: 'icon-192.png', size: 192, motif: 0.62 },
  { name: 'icon-512.png', size: 512, motif: 0.62 },
  { name: 'icon-maskable-512.png', size: 512, motif: 0.48 },
  { name: 'apple-touch-icon.png', size: 180, motif: 0.62 },
]

for (const t of targets) {
  const png = encodePng(renderIcon(t.size, t.motif), t.size)
  writeFileSync(join(OUT, t.name), png)
  console.log(`wrote public/icons/${t.name} (${png.length} bytes)`)
}
