import type { Platform } from './devices.ts'

export function inferPlatform(): Platform {
  if (typeof navigator === 'undefined') {return 'ios'}
  const ua = navigator.userAgent
  if (/android/i.test(ua)) {return 'android'}
  return 'ios'
}

/** CSS layout size × devicePixelRatio — used for Auto export size. */
export function measureHostExportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { height: 2778, width: 1284 }
  }
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(window.screen.width * dpr))
  const height = Math.max(1, Math.round(window.screen.height * dpr))
  return { height, width }
}
