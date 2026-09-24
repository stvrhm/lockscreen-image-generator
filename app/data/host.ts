import type { Platform } from './devices.ts'

export function inferPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'ios'
  let ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  return 'ios'
}

/** CSS layout size × devicePixelRatio — used for Auto export size. */
export function measureHostExportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1284, height: 2778 }
  }
  let dpr = window.devicePixelRatio || 1
  let width = Math.max(1, Math.round(window.screen.width * dpr))
  let height = Math.max(1, Math.round(window.screen.height * dpr))
  return { width, height }
}
