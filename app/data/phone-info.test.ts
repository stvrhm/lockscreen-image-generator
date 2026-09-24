import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detectPhoneInfo,
  formatModel,
  formatOS,
  phoneInfoLabel,
  phoneInfoNotes,
  prefillFields,
  readPhoneInfo,
} from './phone-info.ts'

const ua = {
  ios26Safari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  samsungInternet:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  linuxChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:130.0) Gecko/20100101 Firefox/130.0',
}

test('iOS Safari reports iPhone and the Safari version, not the frozen OS token', () => {
  assert.deepEqual(detectPhoneInfo(ua.ios26Safari), { model: 'iPhone', os: 'iOS 26.0' })
})

test('iOS without a Safari Version token omits the OS', () => {
  assert.deepEqual(detectPhoneInfo(ua.iosChrome), { model: 'iPhone' })
})

test('Android Chrome with Client Hints reports the real model and version', () => {
  assert.deepEqual(
    detectPhoneInfo(ua.androidChrome, { model: 'Pixel 7', platformVersion: '14.0.0' }),
    { model: 'Pixel 7', os: 'Android 14' },
  )
})

test('Android versions keep meaningful minor parts', () => {
  assert.deepEqual(
    detectPhoneInfo(ua.androidChrome, { model: 'Pixel 7', platformVersion: '13.1.0' }),
    { model: 'Pixel 7', os: 'Android 13.1' },
  )
})

test('Android Chrome without Client Hints never shows the frozen Android 10 or model K', () => {
  assert.deepEqual(detectPhoneInfo(ua.androidChrome), {})
})

test('Samsung Internet reports the SM- model verbatim', () => {
  assert.deepEqual(
    detectPhoneInfo(ua.samsungInternet, { model: 'SM-S911B', platformVersion: '15.0.0' }),
    { model: 'SM-S911B', os: 'Android 15' },
  )
})

test('blank Client Hints values are omitted', () => {
  assert.deepEqual(detectPhoneInfo(ua.androidChrome, { model: '  ', platformVersion: '' }), {})
})

test('Firefox for Android reports the Android version from the UA and no model', () => {
  assert.deepEqual(detectPhoneInfo(ua.firefoxAndroid), { os: 'Android 14' })
})

test('desktop browsers report nothing frozen or unparseable', () => {
  assert.deepEqual(detectPhoneInfo(ua.macChrome), {})
  assert.deepEqual(detectPhoneInfo(ua.windowsChrome), {})
  assert.deepEqual(detectPhoneInfo(ua.linuxChrome), {})
})

test('desktop Client Hints never supply a model', () => {
  assert.deepEqual(detectPhoneInfo(ua.macChrome, { model: '', platformVersion: '15.5.0' }), {})
})

test('other browsers fall back to a plausible parsed OS', () => {
  assert.deepEqual(detectPhoneInfo(ua.macFirefox), { os: 'macOS 14.5' })
})

test('an empty user agent detects nothing', () => {
  assert.deepEqual(detectPhoneInfo(''), {})
})

test('per-item formats', () => {
  assert.equal(formatModel('Pixel 7'), '# Pixel 7')
  assert.equal(formatOS('Android 14'), 'Android 14')
})

test('Notes put the model Heading above the OS', () => {
  assert.equal(phoneInfoNotes({ model: 'Pixel 7', os: 'Android 14' }), '# Pixel 7\nAndroid 14')
})

test('Notes omit undetected items', () => {
  assert.equal(phoneInfoNotes({ model: 'iPhone' }), '# iPhone')
  assert.equal(phoneInfoNotes({ os: 'Android 14' }), 'Android 14')
  assert.equal(phoneInfoNotes({}), '')
})

test('the Label is the model, if detected', () => {
  assert.equal(phoneInfoLabel({ model: 'SM-S911B', os: 'Android 15' }), 'SM-S911B')
  assert.equal(phoneInfoLabel({ os: 'Android 14' }), '')
})

test('pre-fill fills only fields the user has not typed in', () => {
  let info = { model: 'Pixel 7', os: 'Android 14' }

  assert.deepEqual(prefillFields(info, { label: false, notes: false }), {
    label: 'Pixel 7',
    notes: '# Pixel 7\nAndroid 14',
  })
  assert.deepEqual(prefillFields(info, { label: true, notes: false }), {
    notes: '# Pixel 7\nAndroid 14',
  })
  assert.deepEqual(prefillFields(info, { label: false, notes: true }), { label: 'Pixel 7' })
  assert.deepEqual(prefillFields(info, { label: true, notes: true }), {})
})

test('pre-fill leaves fields alone when nothing was detected', () => {
  assert.deepEqual(prefillFields({}, { label: false, notes: false }), {})
  assert.deepEqual(prefillFields({ os: 'Android 14' }, { label: false, notes: false }), {
    notes: 'Android 14',
  })
})

test('reading from the Host uses Client Hints where available', async () => {
  let requested: string[] = []
  let info = await readPhoneInfo({
    userAgent: ua.androidChrome,
    userAgentData: {
      async getHighEntropyValues(hints) {
        requested = hints
        return { model: 'Pixel 7', platformVersion: '14.0.0' }
      },
    },
  })

  assert.deepEqual(requested, ['model', 'platformVersion'])
  assert.deepEqual(info, { model: 'Pixel 7', os: 'Android 14' })
})

test('a Client Hints rejection counts as unavailable', async () => {
  let info = await readPhoneInfo({
    userAgent: ua.androidChrome,
    userAgentData: { getHighEntropyValues: () => Promise.reject(new Error('denied')) },
  })

  assert.deepEqual(info, {})
})

test('reading from a Host without Client Hints uses the user agent alone', async () => {
  assert.deepEqual(await readPhoneInfo({ userAgent: ua.ios26Safari }), {
    model: 'iPhone',
    os: 'iOS 26.0',
  })
})
