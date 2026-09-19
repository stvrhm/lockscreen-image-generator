import Bowser from 'bowser/src/bowser.js'
import type { Platform } from './devices.ts'

export interface HostDetails {
  width: number
  height: number
  pixelRatio: number
  detectedOS?: string
}

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

export function hostDetails(): HostDetails {
  let size = measureHostExportSize()
  let pixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  let detectedOS = detectHostOS()
  return { ...size, pixelRatio, detectedOS }
}

function detectHostOS(): string | undefined {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return undefined
  let parser = Bowser.getParser(navigator.userAgent)
  let name = parser.getOSName()
  let version = parser.getOSVersion()
  if (!name || !version || !/^\d+(?:\.\d+){0,3}$/.test(version)) return undefined
  return `${name} ${version}`
}
