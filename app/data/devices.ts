// Device data access: a single JSON file is the entire persistence layer for
// this internal tool (~40 test devices, single local user, no database).
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { enum_, object, string, type InferOutput } from 'remix/data-schema'
import { maxLength, minLength } from 'remix/data-schema/checks'

export type Platform = 'ios' | 'android'

export interface Device {
  id: string
  label: string
  platform: Platform
  notes: string
  updatedAt: string
}

// Field-level schemas are exported individually so the form-data boundary
// schema (built with `f.field(...)` in the devices controller) validates the
// exact same rules as this plain-object schema.
export const labelSchema = string().pipe(minLength(1), maxLength(80))
export const platformSchema = enum_(['ios', 'android'])
export const notesSchema = string().pipe(maxLength(4000))

export const deviceInputSchema = object({
  label: labelSchema,
  platform: platformSchema,
  notes: notesSchema,
})

export type DeviceInput = InferOutput<typeof deviceInputSchema>

const dataFile = path.join(process.cwd(), 'db', 'devices.json')

async function readAll(): Promise<Device[]> {
  try {
    let raw = await readFile(dataFile, 'utf-8')
    return JSON.parse(raw) as Device[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function writeAll(devices: Device[]): Promise<void> {
  await mkdir(path.dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(devices, null, 2) + '\n', 'utf-8')
}

export async function listDevices(): Promise<Device[]> {
  let devices = await readAll()
  return devices.sort((a, b) => a.label.localeCompare(b.label))
}

export async function findDevice(id: string): Promise<Device | undefined> {
  let devices = await readAll()
  return devices.find((device) => device.id === id)
}

export async function createDevice(input: DeviceInput): Promise<Device> {
  let devices = await readAll()
  let device: Device = {
    id: randomUUID(),
    label: input.label,
    platform: input.platform,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  }
  devices.push(device)
  await writeAll(devices)
  return device
}

export async function updateDevice(id: string, input: DeviceInput): Promise<Device | undefined> {
  let devices = await readAll()
  let index = devices.findIndex((device) => device.id === id)
  if (index === -1) return undefined

  let updated: Device = {
    ...devices[index],
    label: input.label,
    platform: input.platform,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  }
  devices[index] = updated
  await writeAll(devices)
  return updated
}

export async function deleteDevice(id: string): Promise<boolean> {
  let devices = await readAll()
  let next = devices.filter((device) => device.id !== id)
  if (next.length === devices.length) return false
  await writeAll(next)
  return true
}
