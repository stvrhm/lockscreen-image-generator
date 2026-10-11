import {
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
  createId,
} from './devices.ts'
import { type CustomDimensionIssue, customDimensionIssue } from './device-dimensions.ts'

const FILE_TYPE = 'test-device-lockscreen',
  FILE_VERSION = 1

export function downloadDeviceFile(device: Device): void {
  const payload = {
    type: FILE_TYPE,
    version: FILE_VERSION,
    device: {
      label: device.label,
      platform: device.platform,
      notes: device.notes,
      exportSizeMode: device.exportSizeMode,
      customWidth: device.customWidth,
      customHeight: device.customHeight,
      encoding: device.encoding,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slug(device.label) || 'device'}-lockscreen-device.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function readDeviceFile(file: File): Promise<Device> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isRecord(parsed) || parsed.type !== FILE_TYPE || parsed.version !== FILE_VERSION) {
    throw new Error('This is not a supported Lockscreens Device file.')
  }
  const value = parsed.device
  if (
    !isRecord(value) ||
    typeof value.label !== 'string' ||
    typeof value.notes !== 'string' ||
    !isPlatform(value.platform) ||
    !isExportSizeMode(value.exportSizeMode) ||
    !isExportEncoding(value.encoding) ||
    typeof value.customWidth !== 'number' ||
    typeof value.customHeight !== 'number'
  ) {
    throw new Error('The Device file is missing valid project details.')
  }
  const dimensionIssue = customDimensionIssue(value.customWidth, value.customHeight)
  if (dimensionIssue) {
    throw new DeviceFileDimensionError(dimensionIssue)
  }
  const now = new Date().toISOString()
  return {
    createdAt: now,
    customHeight: value.customHeight,
    customWidth: value.customWidth,
    encoding: value.encoding,
    exportSizeMode: value.exportSizeMode,
    id: createId(),
    label: value.label,
    notes: value.notes,
    platform: value.platform,
    updatedAt: now,
  }
}

export class DeviceFileDimensionError extends Error {
  constructor(readonly issue: CustomDimensionIssue) {
    super('The Device file has unsupported custom Wallpaper dimensions.')
    this.name = 'DeviceFileDimensionError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlatform(value: unknown): value is Platform {
  return value === 'ios' || value === 'android'
}

function isExportSizeMode(value: unknown): value is ExportSizeMode {
  return value === 'auto' || value === 'custom'
}

function isExportEncoding(value: unknown): value is ExportEncoding {
  return value === 'quality' || value === 'size'
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
}
