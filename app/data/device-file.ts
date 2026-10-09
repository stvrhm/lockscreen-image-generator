import {
  createId,
  type Device,
  type ExportEncoding,
  type ExportSizeMode,
  type Platform,
} from './devices.ts'
import { customDimensionIssue, type CustomDimensionIssue } from './device-dimensions.ts'

const FILE_TYPE = 'test-device-lockscreen'
const FILE_VERSION = 1

export function downloadDeviceFile(device: Device): void {
  let payload = {
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
  let blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  let url = URL.createObjectURL(blob)
  let link = document.createElement('a')
  link.href = url
  link.download = `${slug(device.label) || 'device'}-lockscreen-device.json`
  document.body.appendChild(link)
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
  let value = parsed.device
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
  let dimensionIssue = customDimensionIssue(value.customWidth, value.customHeight)
  if (dimensionIssue) throw new DeviceFileDimensionError(dimensionIssue)
  let now = new Date().toISOString()
  return {
    id: createId(),
    label: value.label,
    platform: value.platform,
    notes: value.notes,
    exportSizeMode: value.exportSizeMode,
    customWidth: value.customWidth,
    customHeight: value.customHeight,
    encoding: value.encoding,
    createdAt: now,
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
