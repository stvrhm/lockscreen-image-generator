// Generates PWA icons: dark lockscreen phone silhouette on charcoal.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// This script implements PNG's byte layout, CRC algorithm, and pixel coordinates.
// Those literals define the format and geometry directly.
// oxlint-disable no-magic-numbers

const BG = [0x15, 0x17, 0x1B]
const OUT = join(import.meta.dirname, '..', 'public', 'icons')
const PHONE = [0x5E, 0xB8, 0xFF]
const SCREEN = [0x2A, 0x30, 0x38]

function clamp01(x) {
  if (x < 0) {return 0}
  if (x > 1) {return 1}
  return x
}

function roundedRectSD(px, py, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2,
   cy = (y0 + y1) / 2,
   hx = (x1 - x0) / 2 - r,
   hy = (y1 - y0) / 2 - r,
   qx = Math.abs(px - cx) - hx,
   qy = Math.abs(py - cy) - hy,
   dx = Math.max(qx, 0),
   dy = Math.max(qy, 0)
  return Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - r
}

function renderIcon(size, motifScale) {
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = BG[0]
    buf[i * 4 + 1] = BG[1]
    buf[i * 4 + 2] = BG[2]
    buf[i * 4 + 3] = 0xFF
  }

  const band = size * motifScale,
   left = (size - band * 0.55) / 2,
   right = left + band * 0.55,
   top = (size - band) / 2,
   bottom = top + band,
   radius = band * 0.12,
   inset = band * 0.06

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5,
       py = y + 0.5,
       body = clamp01(0.5 - roundedRectSD(px, py, left, top, right, bottom, radius)),
       screen = clamp01(
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
      if (body <= 0 && screen <= 0) {continue}
      const i = (y * size + x) * 4
      let r = BG[0],
       g = BG[1],
       b = BG[2]
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
    for (let k = 0; k < 8; k++) {c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1}
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)}
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii'),
   crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
   ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = size * 4,
   raw = Buffer.alloc((stride + 1) * size)
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
  { motif: 0.62, name: 'icon-192.png', size: 192 },
  { motif: 0.62, name: 'icon-512.png', size: 512 },
  { motif: 0.48, name: 'icon-maskable-512.png', size: 512 },
  { motif: 0.62, name: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  const png = encodePng(renderIcon(t.size, t.motif), t.size)
  writeFileSync(join(OUT, t.name), png)
  console.log(`wrote public/icons/${t.name} (${png.length} bytes)`)
}
