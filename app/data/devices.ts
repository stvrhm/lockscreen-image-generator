export type Platform = 'ios' | 'android'
export type ExportSizeMode = 'auto' | 'custom'
/** Quality = PNG (default). Size = JPEG at fixed compression. */
export type ExportEncoding = 'quality' | 'size'

export interface Device {
  id: string
  label: string
  platform: Platform
  notes: string
  exportSizeMode: ExportSizeMode
  customWidth: number
  customHeight: number
  encoding: ExportEncoding
  createdAt: string
  updatedAt: string
}

export interface DeviceInput {
  label: string
  platform: Platform
  notes: string
  exportSizeMode: ExportSizeMode
  customWidth: number
  customHeight: number
  encoding: ExportEncoding
}

const DB_NAME = 'tdl-devices',
  DB_VERSION = 1,
  DEVICE_CHANGE_CHANNEL = 'tdl:device-changes',
  LAST_DRAFT_KEY = 'tdl:last-draft-id',
  STORE = 'devices'

export class DeviceLabelConflictError extends Error {
  constructor() {
    super('A saved Device already uses this Label')
    this.name = 'DeviceLabelConflictError'
  }
}

export function subscribeToDeviceChanges(onChange: () => void): () => void {
  const channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DEVICE_CHANGE_CHANNEL)
  window.addEventListener('tdl:devices-changed', onChange)
  channel?.addEventListener('message', onChange)
  return () => {
    window.removeEventListener('tdl:devices-changed', onChange)
    channel?.removeEventListener('message', onChange)
    channel?.close()
  }
}

function announceDeviceChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tdl:devices-changed'))
  }
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(DEVICE_CHANGE_CHANNEL)
    // BroadcastChannel.postMessage has no target-origin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    channel.postMessage(null)
    channel.close()
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB open failed')),
      { once: true },
    )
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener(
      'upgradeneeded',
      () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
      { once: true },
    )
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed')),
      { once: true },
    )
  })
}

export function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // UUID v4 byte offsets, masks, and hexadecimal groups follow the UUID format.
  // oxlint-disable no-magic-numbers
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  // oxlint-enable no-magic-numbers
}

export function blankDevice(platform: Platform, width: number, height: number): Device {
  const now = new Date().toISOString()
  return {
    createdAt: now,
    customHeight: height,
    customWidth: width,
    encoding: 'quality',
    exportSizeMode: 'auto',
    id: createId(),
    label: '',
    notes: '',
    platform,
    updatedAt: now,
  }
}

/** Compare Labels the same way users expect visually equivalent names to compare. */
export function normalizeDeviceLabel(label: string): string {
  return label.trim().toLowerCase()
}

/** First available default name among saved Devices. Drafts never enter this list. */
export function nextDeviceLabel(devices: Device[]): string {
  const used = new Set(devices.map((device) => normalizeDeviceLabel(device.label)))
  if (!used.has('new device')) {
    return 'New Device'
  }
  for (let number = 2; ; number++) {
    const label = `New Device ${number}`
    if (!used.has(normalizeDeviceLabel(label))) {
      return label
    }
  }
}

/** Preserve the Browse copy convention while choosing a unique saved Label. */
export function nextCopyLabel(sourceLabel: string, devices: Device[]): string {
  const used = new Set(devices.map((device) => normalizeDeviceLabel(device.label)))
  const base = sourceLabel.trim() ? `Copy of ${sourceLabel.trim()}` : 'New Device'
  if (!used.has(normalizeDeviceLabel(base))) {
    return base
  }
  for (let number = 2; ; number++) {
    const label = `${base} ${number}`
    if (!used.has(normalizeDeviceLabel(label))) {
      return label
    }
  }
}

export async function listDevices(): Promise<Device[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const devices = await idbRequest(store.getAll() as IDBRequest<Device[]>)
    return devices.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally {
    db.close()
  }
}

export async function findDevice(id: string): Promise<Device | undefined> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    return await idbRequest(store.get(id) as IDBRequest<Device | undefined>)
  } finally {
    db.close()
  }
}

export async function saveDevice(
  device: Device,
  { allowUnchangedDuplicate = false }: { allowUnchangedDuplicate?: boolean } = {},
): Promise<Device> {
  const next: Device = { ...device, updatedAt: new Date().toISOString() }
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    await new Promise<void>((resolve, reject) => {
      const lookup = store.getAll() as IDBRequest<Device[]>
      lookup.addEventListener(
        'success',
        () => {
          const conflict = lookup.result.some(
            (saved) =>
              saved.id !== next.id &&
              normalizeDeviceLabel(saved.label) === normalizeDeviceLabel(next.label),
          )
          const existing = lookup.result.find((saved) => saved.id === next.id)
          const mayKeepLegacyDuplicate =
            allowUnchangedDuplicate && existing?.label === next.label && Boolean(conflict)
          if (conflict && !mayKeepLegacyDuplicate) {
            reject(new DeviceLabelConflictError())
            tx.abort()
            return
          }
          store.put(next)
        },
        { once: true },
      )
      lookup.addEventListener(
        'error',
        () => reject(lookup.error ?? new Error('IndexedDB read failed')),
        { once: true },
      )
      tx.addEventListener('complete', () => resolve(), { once: true })
      tx.addEventListener('error', () => reject(tx.error ?? new Error('IndexedDB write failed')), {
        once: true,
      })
      tx.addEventListener('abort', () => reject(tx.error ?? new Error('IndexedDB write aborted')), {
        once: true,
      })
    })
  } finally {
    db.close()
  }
  setLastDraftId(next.id)
  announceDeviceChange()
  return next
}

export async function deleteDevice(id: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    await idbRequest(store.delete(id))
    await new Promise<void>((resolve, reject) => {
      tx.addEventListener('complete', () => resolve(), { once: true })
      tx.addEventListener('error', () => reject(tx.error ?? new Error('IndexedDB delete failed')), {
        once: true,
      })
    })
  } finally {
    db.close()
  }
  if (getLastDraftId() === id) {
    clearLastDraftId()
  }
  announceDeviceChange()
}

export async function duplicateDevice(source: Device): Promise<Device> {
  const now = new Date().toISOString()
  return duplicateDeviceAttempt(source, now)
}

async function duplicateDeviceAttempt(source: Device, now: string): Promise<Device> {
  const devices = await listDevices()
  const copy: Device = {
    ...source,
    id: createId(),
    label: nextCopyLabel(source.label, devices),
    createdAt: now,
    updatedAt: now,
  }
  return saveDevice(copy).catch((error: unknown) => {
    if (error instanceof DeviceLabelConflictError) {
      // A fresh read is required after each conflicting write.
      return duplicateDeviceAttempt(source, now)
    }
    throw error
  })
}

export function getLastDraftId(): string | null {
  try {
    return localStorage.getItem(LAST_DRAFT_KEY)
  } catch {
    return null
  }
}

export function setLastDraftId(id: string) {
  try {
    localStorage.setItem(LAST_DRAFT_KEY, id)
  } catch {
    // Private mode — Continue may be unavailable until storage works.
  }
}

export function clearLastDraftId() {
  try {
    localStorage.removeItem(LAST_DRAFT_KEY)
  } catch {
    // Ignore
  }
}

export async function getLastDraft(): Promise<Device | undefined> {
  const id = getLastDraftId()
  if (!id) {
    return undefined
  }
  return findDevice(id)
}
