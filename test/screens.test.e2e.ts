import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
import { describe, it, type TestContext } from 'remix/test'
import type { Page } from 'playwright'

import { router } from '../app/router.tsx'
import { routes } from '../app/routes.ts'
import { strings } from '../app/strings.ts'

// Each test gets its own server port, so its origin — and therefore its
// IndexedDB — starts empty.
async function open(t: TestContext, href: string): Promise<Page> {
  let page = await t.serve(await createTestServer(router.fetch))
  await page.goto(href)
  return page
}

// Waits for the screen to appear, then asserts it is the only one rendered.
async function expectScreen(page: Page, heading: string) {
  await page.locator('h1', { hasText: heading }).waitFor()
  assert.deepEqual(await page.locator('h1').allInnerTexts(), [heading])
}

function pathname(page: Page): string {
  return new URL(page.url()).pathname
}

// Marks the current document so a later assertion can tell a client
// navigation from a full document load through the shell.
async function markDocument(page: Page) {
  await page.evaluate(() => ((window as { __sameDocument?: boolean }).__sameDocument = true))
}

async function isSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as { __sameDocument?: boolean }).__sameDocument === true)
}

describe('direct URLs render exactly one screen', () => {
  let cases: [string, string][] = [
    [routes.screens.home.href(), strings.start.title],
    [routes.screens.newDevice.href(), strings.editor.titleNew],
    [routes.screens.browseDevices.href(), strings.browse.title],
    ['/no-such-screen', strings.notFound.title],
  ]

  for (let [href, heading] of cases) {
    it(href, async (t) => {
      let page = await open(t, href)
      await expectScreen(page, heading)
    })
  }
})

describe('redirects land on the URL that rendered', () => {
  it('Continue without a Draft goes Home', async (t) => {
    let page = await open(t, routes.screens.continueDevice.href())

    await expectScreen(page, strings.start.title)
    assert.equal(pathname(page), routes.screens.home.href())
  })

  it('Edit for a missing Device goes to Browse', async (t) => {
    let page = await open(t, routes.screens.editDevice.href({ id: 'missing' }))

    await expectScreen(page, strings.browse.title)
    assert.equal(pathname(page), routes.screens.browseDevices.href())
  })
})

// Pre-fill waits on Client Hints; a later Client Hints call in the page
// resolves after the Editor's, so the pre-fill has had its chance to apply.
// A New Device on an emulated Pixel 7 running Chrome, with Client Hints.
// `stallClientHints` makes them never answer, like a slow Host.
async function openAndroid(t: TestContext, { stallClientHints = false } = {}): Promise<Page> {
  let page = await t.serve(await createTestServer(router.fetch))
  if (stallClientHints) {
    await page.addInitScript(() => {
      let proto = (globalThis as { NavigatorUAData?: { prototype: object } }).NavigatorUAData
        ?.prototype
      if (proto) {
        Object.defineProperty(proto, 'getHighEntropyValues', { value: () => new Promise(() => {}) })
      }
    })
  }
  let cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    userAgentMetadata: {
      platform: 'Android',
      platformVersion: '14.0.0',
      model: 'Pixel 7',
      architecture: '',
      mobile: true,
    },
  })
  await page.goto(routes.screens.newDevice.href())
  await expectScreen(page, strings.editor.titleNew)
  return page
}

describe('New Device pre-fill from Phone info', () => {
  it('starts with empty Label and Notes in desktop Chromium', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)

    assert.equal(await page.locator('#device-label').inputValue(), '')
    assert.equal(await page.locator('#device-notes').inputValue(), '')
  })

  it('fills Label and Notes from Client Hints on Android Chrome', async (t) => {
    let page = await openAndroid(t)

    assert.equal(await page.locator('#device-label').inputValue(), 'Pixel 7')
    assert.equal(await page.locator('#device-notes').inputValue(), '# Pixel 7\nAndroid 14')
  })

  it('opens empty when Client Hints do not answer in time', async (t) => {
    let page = await openAndroid(t, { stallClientHints: true })

    assert.equal(await page.locator('#device-label').inputValue(), '')
    assert.equal(await page.locator('#device-notes').inputValue(), '')
  })
})

describe('the Notes toolbar', () => {
  it('formats with a single tap on each button', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)
    let notes = page.locator('#device-notes')

    for (let [label, expected] of [
      [strings.editor.bold, '**abc**'],
      [strings.editor.italic, '*abc*'],
      [strings.editor.strike, '~~abc~~'],
      [strings.editor.code, '`abc`'],
      [strings.editor.headingLarge, '# abc'],
      [strings.editor.headingMedium, '## abc'],
    ]) {
      await notes.fill('abc')
      await notes.tap()
      await notes.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 3))
      await page.getByRole('button', { name: label, exact: true }).tap()
      assert.equal(await notes.inputValue(), expected, `one tap on ${label}`)
    }
  })

  it('reflects the selected formatting and toggles it off', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)
    let notes = page.locator('#device-notes')
    let bold = page.getByRole('button', { name: strings.editor.bold, exact: true })

    await notes.fill('**abc**')
    await notes.focus()
    await notes.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 5))
    await page.waitForFunction(
      (name) =>
        document.querySelector(`button[aria-label="${name}"]`)?.getAttribute('aria-pressed') ===
        'true',
      strings.editor.bold,
    )

    await bold.tap()
    assert.equal(await notes.inputValue(), 'abc')
    assert.equal(await bold.getAttribute('aria-pressed'), 'false')

    await notes.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 3))
    await bold.tap()
    assert.equal(await notes.inputValue(), '**abc**')
    assert.equal(await bold.getAttribute('aria-pressed'), 'true')
  })

  it('shows a button tooltip on keyboard focus', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)

    await page.getByRole('button', { name: strings.editor.bold, exact: true }).focus()
    await page.keyboard.press('Tab')
    await page.getByRole('tooltip', { name: strings.editor.italic }).waitFor()
  })
})

describe('the Phone info overlay', () => {
  it('shows the empty state in desktop Chromium, and no Shortcut chips exist', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)

    for (let chip of ['Canvas size', 'Pixel density', 'Detected OS', 'Insert from Device']) {
      assert.equal(await page.getByText(chip, { exact: true }).count(), 0, `${chip} is still shown`)
    }

    let trigger = page.getByRole('button', { name: strings.editor.phoneInfo })
    await trigger.click()
    let overlay = page.getByRole('dialog', { name: strings.editor.phoneInfo })
    await overlay.getByText(strings.editor.phoneInfoEmpty).waitFor()
    assert.equal(await overlay.getByRole('button').count(), 0, 'the empty state offers Add actions')

    await page.keyboard.press('Escape')
    await overlay.waitFor({ state: 'hidden' })
    assert.ok(
      await trigger.evaluate((node) => node === document.activeElement),
      'focus did not return to the Phone info button',
    )

    await page.keyboard.press('Enter')
    await overlay.getByText(strings.editor.phoneInfoEmpty).waitFor()
    await trigger.click()
    await overlay.waitFor({ state: 'hidden' })
  })

  it('re-inserts Phone info with Add all after Notes are cleared on Android Chrome', async (t) => {
    let page = await openAndroid(t)
    let notes = page.locator('#device-notes')
    await page.waitForFunction(
      () => (document.querySelector('#device-notes') as HTMLTextAreaElement | null)?.value !== '',
    )
    await notes.fill('')

    await page.getByRole('button', { name: strings.editor.phoneInfo }).click()
    let overlay = page.getByRole('dialog', { name: strings.editor.phoneInfo })
    await overlay.getByText('Pixel 7', { exact: true }).waitFor()
    await overlay.getByText('Android 14', { exact: true }).waitFor()
    await overlay.getByRole('button', { name: strings.editor.phoneInfoAddAll }).click()

    await overlay.waitFor({ state: 'hidden' })
    assert.equal(await notes.inputValue(), '# Pixel 7\nAndroid 14')
    assert.ok(
      await notes.evaluate((node) => node === document.activeElement),
      'focus did not return to Notes',
    )
  })
})

describe('a Device round trip', () => {
  it('creates, survives refresh, and moves through history in one document', async (t) => {
    let page = await open(t, routes.screens.home.href())
    await markDocument(page)

    await page.getByRole('link', { name: strings.start.new }).click()
    await expectScreen(page, strings.editor.titleNew)

    await page.getByLabel(/label/i).first().fill('Pixel 9 QA')
    await page.getByRole('button', { name: strings.editor.saveDevice }).click()
    await page.waitForURL(/\/devices\/[^/]+\/edit$/)
    let editPath = pathname(page)
    await expectScreen(page, strings.editor.titleEdit)
    assert.ok(await isSameDocument(page), 'creating a Device reloaded the document')

    await page.reload()
    assert.equal(pathname(page), editPath)
    await expectScreen(page, strings.editor.titleEdit)
    await markDocument(page)

    await page.getByRole('link', { name: strings.editor.back }).click()
    await expectScreen(page, strings.start.title)

    await page.goBack()
    await page.waitForURL((url) => url.pathname === editPath)
    await expectScreen(page, strings.editor.titleEdit)

    await page.goForward()
    await page.waitForURL((url) => url.pathname === routes.screens.home.href())
    await expectScreen(page, strings.start.title)
    assert.ok(await isSameDocument(page), 'history navigation reloaded the document')

    await page.getByRole('link', { name: strings.start.continue }).click()
    await expectScreen(page, strings.editor.titleEdit)
  })

  it('saving a new Device keeps the scroll position and confirms with a toast', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await page.getByLabel(/label/i).first().fill('Pixel 9 QA')
    let save = page.getByRole('button', { name: strings.editor.saveDevice })
    await save.scrollIntoViewIfNeeded()
    let scrollBefore = await page.evaluate(() => window.scrollY)
    assert.ok(scrollBefore > 0, 'the Save Device button should be below the fold')

    await save.click()
    await page.waitForURL(/\/edit$/)
    await expectScreen(page, strings.editor.titleEdit)
    await page.getByLabel('Notifications').getByText(strings.editor.deviceSaved).waitFor()
    assert.equal(await page.evaluate(() => window.scrollY), scrollBefore)
  })

  it('duplicates and deletes from Browse', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await page.getByLabel(/label/i).first().fill('Pixel 9 QA')
    await page.getByRole('button', { name: strings.editor.saveDevice }).click()
    await page.waitForURL(/\/edit$/)

    await page.goto(routes.screens.browseDevices.href())
    await page.getByRole('button', { name: strings.browse.duplicate }).click()
    await page.waitForURL(/\/edit$/)

    await page.goto(routes.screens.browseDevices.href())
    let labels = page.locator('li strong')
    await labels.nth(1).waitFor()
    assert.deepEqual((await labels.allInnerTexts()).sort(), ['Copy of Pixel 9 QA', 'Pixel 9 QA'])

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: strings.browse.delete }).first().click()
    await labels.nth(1).waitFor({ state: 'detached' })
    assert.equal(await labels.count(), 1)
  })
})
