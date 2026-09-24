import Bowser from 'bowser/src/bowser.js'

/**
 * Phone info: the Host's phone model and Detected OS, each omitted when the
 * browser does not expose a trustworthy value. Never stored; read from the
 * Host whenever needed. Detection rules are recorded in ADR 0002.
 */
export interface PhoneInfo {
  model?: string
  os?: string
}

/** User-Agent Client Hints high-entropy values, where the browser offers them. */
export interface ClientHints {
  model?: string
  platformVersion?: string
}

/** The slice of `navigator` the browser adapter reads. */
export interface PhoneInfoHost {
  userAgent: string
  userAgentData?: {
    getHighEntropyValues(hints: string[]): Promise<ClientHints>
  }
}

/**
 * Pure detection. Conservative on purpose: versions a browser is known to
 * freeze or fake are omitted rather than shown.
 */
export function detectPhoneInfo(userAgent: string, hints?: ClientHints): PhoneInfo {
  if (/\b(?:iPhone|iPod)\b/.test(userAgent)) {
    // Safari 26+ freezes the UA OS token at 18_x; its own version tracks iOS.
    let safari = /\bVersion\/(\d+(?:\.\d+)*)/.exec(userAgent)
    return compact({ model: 'iPhone', os: safari ? `iOS ${safari[1]}` : undefined })
  }

  if (/\bAndroid\b/.test(userAgent)) {
    let model = hints?.model?.trim()
    let hintVersion = hints?.platformVersion?.trim()
    if (hintVersion) return compact({ model, os: `Android ${trimVersion(hintVersion)}` })
    // Chromium reports a fixed `Android 10; K` in place of the real values.
    if (/\bAndroid 10; K[;)]/.test(userAgent)) return compact({ model })
    let uaVersion = /\bAndroid (\d+(?:\.\d+)*)/.exec(userAgent)
    return compact({ model, os: uaVersion ? `Android ${trimVersion(uaVersion[1])}` : undefined })
  }

  return compact({ os: parsedOS(userAgent) })
}

export interface PhoneInfoItem {
  kind: 'model' | 'os'
  value: string
  /** The item as it appears in Notes. */
  line: string
}

/** Detected items in Notes order: model Heading, then OS — each only if detected. */
export function phoneInfoItems(info: PhoneInfo): PhoneInfoItem[] {
  let items: PhoneInfoItem[] = []
  if (info.model) items.push({ kind: 'model', value: info.model, line: `# ${info.model}` })
  if (info.os) items.push({ kind: 'os', value: info.os, line: info.os })
  return items
}

/** Notes text for a New Device, or for re-inserting every item. */
export function phoneInfoNotes(info: PhoneInfo): string {
  return phoneInfoItems(info)
    .map((item) => item.line)
    .join('\n')
}

/** Label for a New Device: the model, if detected. */
export function phoneInfoLabel(info: PhoneInfo): string {
  return info.model ?? ''
}

/**
 * How long to wait for Client Hints. They normally answer within milliseconds;
 * the limit keeps a slow Host from stalling a New Device or the overlay.
 */
const CLIENT_HINTS_TIMEOUT = 300

/**
 * Browser adapter. Never rejects; Client Hints that fail, or that take longer
 * than `timeout` milliseconds, count as unavailable.
 */
export async function readPhoneInfo({
  host = globalThis.navigator as PhoneInfoHost | undefined,
  timeout = CLIENT_HINTS_TIMEOUT,
}: { host?: PhoneInfoHost; timeout?: number } = {}): Promise<PhoneInfo> {
  if (!host?.userAgent) return {}
  let hints: ClientHints | undefined
  try {
    let request = host.userAgentData?.getHighEntropyValues(['model', 'platformVersion'])
    hints = request && (await withinTimeout(request, timeout))
  } catch {
    hints = undefined
  }
  return detectPhoneInfo(host.userAgent, hints)
}

function withinTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: Parameters<typeof clearTimeout>[0]
  let expired = new Promise<undefined>((resolve) => {
    timer = setTimeout(resolve, ms)
  })
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer))
}

function parsedOS(userAgent: string): string | undefined {
  if (!userAgent) return undefined
  let parser = Bowser.getParser(userAgent)
  let name = parser.getOSName()
  let version = parser.getOSVersion()
  if (!name || !version || !/^\d+(?:\.\d+){0,3}$/.test(version)) return undefined
  // Browsers on every Mac report this frozen version.
  if (name === 'macOS' && version === '10.15.7') return undefined
  return `${name} ${version}`
}

/** `14.0.0` → `14`, `13.1.0` → `13.1`. */
function trimVersion(version: string): string {
  return version.replace(/(?:\.0+)+$/, '')
}

function compact(info: PhoneInfo): PhoneInfo {
  let result: PhoneInfo = {}
  let model = info.model?.trim()
  let os = info.os?.trim()
  if (model) result.model = model
  if (os) result.os = os
  return result
}
