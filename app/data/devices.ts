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

const DB_NAME = 'tdl-devices'
const DB_VERSION = 1
const STORE = 'devices'
const LAST_DRAFT_KEY = 'tdl:last-draft-id'
const DEVICE_CHANGE_CHANNEL = 'tdl:device-changes'

export class DeviceLabelConflictError extends Error {
  constructor() {
    super('A saved Device already uses this Label')
    this.name = 'DeviceLabelConflictError'
  }
}

export function subscribeToDeviceChanges(onChange: () => void): () => void {
  let channel =
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
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tdl:devices-changed'))
  if (typeof BroadcastChannel !== 'undefined') {
    let channel = new BroadcastChannel(DEVICE_CHANGE_CHANNEL)
    channel.postMessage(null)
    channel.close()
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      let db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  let bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  let hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function blankDevice(platform: Platform, width: number, height: number): Device {
  let now = new Date().toISOString()
  return {
    id: createId(),
    label: '',
    platform,
    notes: '',
    exportSizeMode: 'auto',
    customWidth: width,
    customHeight: height,
    encoding: 'quality',
    createdAt: now,
    updatedAt: now,
  }
}

/** Compare Labels the same way users expect visually equivalent names to compare. */
export function normalizeDeviceLabel(label: string): string {
  return label.trim().toLowerCase()
}

/** First available default name among saved Devices. Drafts never enter this list. */
export function nextDeviceLabel(devices: Device[]): string {
  let used = new Set(devices.map((device) => normalizeDeviceLabel(device.label)))
  if (!used.has('new device')) return 'New Device'
  for (let number = 2; ; number++) {
    let label = `New Device ${number}`
    if (!used.has(normalizeDeviceLabel(label))) return label
  }
}

/** Preserve the Browse copy convention while choosing a unique saved Label. */
export function nextCopyLabel(sourceLabel: string, devices: Device[]): string {
  let used = new Set(devices.map((device) => normalizeDeviceLabel(device.label)))
  let base = sourceLabel.trim() ? `Copy of ${sourceLabel.trim()}` : 'New Device'
  if (!used.has(normalizeDeviceLabel(base))) return base
  for (let number = 2; ; number++) {
    let label = `${base} ${number}`
    if (!used.has(normalizeDeviceLabel(label))) return label
  }
}

export async function listDevices(): Promise<Device[]> {
  let db = await openDb()
  try {
    let tx = db.transaction(STORE, 'readonly')
    let store = tx.objectStore(STORE)
    let devices = await idbRequest(store.getAll() as IDBRequest<Device[]>)
    return devices.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally {
    db.close()
  }
}

export async function findDevice(id: string): Promise<Device | undefined> {
  let db = await openDb()
  try {
    let tx = db.transaction(STORE, 'readonly')
    let store = tx.objectStore(STORE)
    return await idbRequest(store.get(id) as IDBRequest<Device | undefined>)
  } finally {
    db.close()
  }
}

export async function saveDevice(
  device: Device,
  { allowUnchangedDuplicate = false }: { allowUnchangedDuplicate?: boolean } = {},
): Promise<Device> {
  let next: Device = { ...device, updatedAt: new Date().toISOString() }
  let db = await openDb()
  try {
    let tx = db.transaction(STORE, 'readwrite')
    let store = tx.objectStore(STORE)
    await new Promise<void>((resolve, reject) => {
      let lookup = store.getAll() as IDBRequest<Device[]>
      lookup.onsuccess = () => {
        let conflict = lookup.result.some(
          (saved) =>
            saved.id !== next.id &&
            normalizeDeviceLabel(saved.label) === normalizeDeviceLabel(next.label),
        )
        let existing = lookup.result.find((saved) => saved.id === next.id)
        let mayKeepLegacyDuplicate =
          allowUnchangedDuplicate && existing?.label === next.label && Boolean(conflict)
        if (conflict && !mayKeepLegacyDuplicate) {
          reject(new DeviceLabelConflictError())
          tx.abort()
          return
        }
        store.put(next)
      }
      lookup.onerror = () => reject(lookup.error ?? new Error('IndexedDB read failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'))
    })
  } finally {
    db.close()
  }
  setLastDraftId(next.id)
  announceDeviceChange()
  return next
}

export async function deleteDevice(id: string): Promise<void> {
  let db = await openDb()
  try {
    let tx = db.transaction(STORE, 'readwrite')
    let store = tx.objectStore(STORE)
    await idbRequest(store.delete(id))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
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
  let now = new Date().toISOString()
  while (true) {
    let devices = await listDevices()
    let copy: Device = {
      ...source,
      id: createId(),
      label: nextCopyLabel(source.label, devices),
      createdAt: now,
      updatedAt: now,
    }
    try {
      return await saveDevice(copy)
    } catch (error) {
      if (!(error instanceof DeviceLabelConflictError)) throw error
    }
  }
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
    // ignore
  }
}

export async function getLastDraft(): Promise<Device | undefined> {
  let id = getLastDraftId()
  if (!id) return undefined
  return findDevice(id)
}
