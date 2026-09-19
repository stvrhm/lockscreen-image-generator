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
  return crypto.randomUUID()
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

export async function saveDevice(device: Device): Promise<Device> {
  let next: Device = { ...device, updatedAt: new Date().toISOString() }
  let db = await openDb()
  try {
    let tx = db.transaction(STORE, 'readwrite')
    let store = tx.objectStore(STORE)
    await idbRequest(store.put(next))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
    })
  } finally {
    db.close()
  }
  setLastDraftId(next.id)
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
}

export async function duplicateDevice(source: Device): Promise<Device> {
  let now = new Date().toISOString()
  let copy: Device = {
    ...source,
    id: createId(),
    label: source.label.trim() ? `Copy of ${source.label.trim()}` : '',
    createdAt: now,
    updatedAt: now,
  }
  return saveDevice(copy)
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
