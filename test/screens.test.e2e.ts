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
      [strings.editor.h1, '# abc'],
      [strings.editor.h2, '## abc'],
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
    let tooltip = page.getByRole('tooltip', { name: strings.editor.italic })
    await tooltip.waitFor()
    assert.match(await tooltip.getAttribute('data-anchor-placement') ?? '', /^(top|bottom)$/)
  })

  it('names the Heading controls H1 and H2', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)

    for (let name of [strings.editor.h1, strings.editor.h2]) {
      assert.equal(
        await page.getByRole('button', { name, exact: true }).innerText(),
        name,
        `${name} is not the visible control`,
      )
    }
  })
})

describe('Formatting help', () => {
  it('explains authoring from an icon beside the Notes label', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)

    assert.equal(await page.getByText(/Start a line with #/).count(), 0)
    assert.equal(await page.locator('#notes-hint').count(), 0)
    assert.equal(await page.locator('#device-notes').getAttribute('aria-describedby'), null)

    let trigger = page.getByRole('button', { name: strings.editor.formattingHelp, exact: true })
    assert.equal(await trigger.innerText(), 'ⓘ')
    assert.equal(await trigger.getAttribute('aria-haspopup'), 'dialog')
    assert.equal(
      await trigger.evaluate(
        (node) =>
          node.parentElement?.contains(document.getElementById('notes-label')) === true &&
          node.closest('[role="toolbar"]') === null,
      ),
      true,
      'Formatting help is not beside the Notes label',
    )

    await trigger.click()
    let dialog = page.getByRole('dialog', { name: strings.editor.formattingHelp })
    await dialog.waitFor()
    assert.match(await dialog.getAttribute('data-anchor-placement') ?? '', /^(top|bottom)$/)
    for (let rule of strings.editor.formattingHelpRules) {
      await dialog.getByText(rule, { exact: true }).waitFor()
    }

    await page.keyboard.press('Escape')
    await expectPopoverClosed(page, 'formatting-help')
    await page.waitForFunction(
      (name) => document.activeElement?.getAttribute('aria-label') === name,
      strings.editor.formattingHelp,
    )

    await page.keyboard.press('Enter')
    await dialog.waitFor()
    await trigger.click()
    await expectPopoverClosed(page, 'formatting-help')
  })
})

function expectPopoverClosed(page: Page, id: string) {
  return page.waitForFunction(
    (dialogId) => document.getElementById(dialogId)?.matches(':popover-open') !== true,
    id,
  )
}

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
    assert.match(await overlay.getAttribute('data-anchor-placement') ?? '', /^(top|bottom)-end$/)
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

describe('custom Wallpaper dimension limits', () => {
  it('keeps invalid editor dimensions visible while blocking save and export', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)
    await page.getByLabel(/label/i).first().fill('Dimension boundary')
    await page.getByText(strings.editor.customizeExport, { exact: true }).click()
    await page.getByRole('button', { name: strings.editor.exportSizeCustom, exact: true }).click()
    let exportSummary = page.locator('strong').filter({ hasText: /\d+ × \d+ px/ }).first()
    let safePreviewSize = await exportSummary.innerText()

    let width = page.getByLabel(strings.editor.width)
    let height = page.getByLabel(strings.editor.height)
    await width.fill('4000')
    await height.fill('3001')

    let sizeError = page.getByText(strings.editor.dimensionIssues['pixel-limit'], { exact: true })
    await sizeError.waitFor()
    assert.equal(await width.inputValue(), '4000')
    assert.equal(await height.inputValue(), '3001')
    assert.equal(await page.getByRole('button', { name: strings.editor.saveDevice }).isDisabled(), true)
    assert.equal(await page.getByRole('button', { name: strings.editor.saveToPhotos }).isDisabled(), true)
    assert.equal(await page.getByRole('button', { name: strings.editor.download }).isDisabled(), true)
    assert.equal(await page.getByText(strings.editor.preview, { exact: true }).first().isVisible(), true)
    assert.equal(await exportSummary.innerText(), safePreviewSize)

    await width.fill('2.5')
    let integerError = page.getByText(
      strings.editor.dimensionIssues['positive-integers'],
      { exact: true },
    )
    await integerError.waitFor()
    assert.equal(await width.inputValue(), '2.5')
    assert.equal(await page.getByRole('button', { name: strings.editor.saveDevice }).isDisabled(), true)

    await width.fill('0')
    assert.equal(await width.inputValue(), '0')
    await width.fill('')
    assert.equal(await width.inputValue(), '')
    await integerError.waitFor()

    await width.fill('4097')
    await height.fill('1')
    let sideError = page.getByText(strings.editor.dimensionIssues['side-limit'], { exact: true })
    await sideError.waitFor()
    assert.equal(await width.inputValue(), '4097')

    await width.fill('4096')
    await sideError.waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('button', { name: strings.editor.saveDevice }).isDisabled(), false)
    await width.fill('3000')
    await height.fill('4000')
    await sizeError.waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('button', { name: strings.editor.saveDevice }).isDisabled(), false)
  })

  it('rejects an imported project whose saved custom dimensions exceed a limit', async (t) => {
    let page = await open(t, routes.screens.browseDevices.href())
    let project = {
      type: 'test-device-lockscreen',
      version: 1,
      device: {
        label: 'Too large',
        platform: 'ios',
        notes: '',
        exportSizeMode: 'auto',
        customWidth: 4097,
        customHeight: 1,
        encoding: 'quality',
      },
    }

    let [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: strings.browse.import, exact: true }).click(),
    ])
    await chooser.setFiles({
      name: 'too-large.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    })

    let notification = page.getByLabel('Notifications').locator('article')
    await notification.waitFor()
    assert.match(await notification.innerText(), new RegExp(strings.browse.importFailed))
    assert.match(await notification.innerText(), /4096/)
    await page.getByText(strings.browse.empty, { exact: true }).waitFor()
    assert.equal(await page.locator('li').count(), 0)
  })

  it('rejects excessive total pixels even when imported in Auto mode', async (t) => {
    let page = await open(t, routes.screens.browseDevices.href())
    let project = {
      type: 'test-device-lockscreen',
      version: 1,
      device: {
        label: 'Too many pixels',
        platform: 'ios',
        notes: '',
        exportSizeMode: 'auto',
        customWidth: 3000,
        customHeight: 4001,
        encoding: 'quality',
      },
    }
    let [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: strings.browse.import, exact: true }).click(),
    ])
    await chooser.setFiles({
      name: 'too-many-pixels.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    })

    let notification = page.getByLabel('Notifications').locator('article')
    await notification.waitFor()
    assert.match(await notification.innerText(), new RegExp(strings.browse.importFailed))
    assert.match(await notification.innerText(), /12,000,000/)
    assert.equal(await page.locator('li').count(), 0)
  })

  it('imports the inclusive total-pixel boundary', async (t) => {
    let page = await open(t, routes.screens.browseDevices.href())
    let project = {
      type: 'test-device-lockscreen',
      version: 1,
      device: {
        label: 'Boundary size',
        platform: 'ios',
        notes: '',
        exportSizeMode: 'auto',
        customWidth: 3000,
        customHeight: 4000,
        encoding: 'quality',
      },
    }
    let [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: strings.browse.import, exact: true }).click(),
    ])
    await chooser.setFiles({
      name: 'boundary-size.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    })

    await page.getByLabel('Notifications').getByText(strings.browse.imported).waitFor()
    await page.locator('li strong').getByText('Boundary size', { exact: true }).waitFor()
  })

  it('imports the inclusive per-side boundary', async (t) => {
    let page = await open(t, routes.screens.browseDevices.href())
    let project = {
      type: 'test-device-lockscreen',
      version: 1,
      device: {
        label: 'Boundary side',
        platform: 'ios',
        notes: '',
        exportSizeMode: 'auto',
        customWidth: 4096,
        customHeight: 1,
        encoding: 'quality',
      },
    }
    let [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: strings.browse.import, exact: true }).click(),
    ])
    await chooser.setFiles({
      name: 'boundary-side.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    })

    await page.getByLabel('Notifications').getByText(strings.browse.imported).waitFor()
    await page.locator('li strong').getByText('Boundary side', { exact: true }).waitFor()
  })

  it('keeps the fallback preview within the limits when Host metrics are large', async (t) => {
    let page = await t.serve(await createTestServer(router.fetch))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 16 })
    })
    await page.goto(routes.screens.newDevice.href())
    await expectScreen(page, strings.editor.titleNew)
    await page.getByText(strings.editor.customizeExport, { exact: true }).click()
    await page.getByRole('button', { name: strings.editor.exportSizeCustom, exact: true }).click()

    let summary = page.locator('strong').filter({ hasText: /\d+ × \d+ px/ }).first()
    let match = (await summary.innerText()).match(/(\d+) × (\d+) px/)
    assert.ok(match, 'preview dimensions are not visible')
    let width = Number(match[1])
    let height = Number(match[2])
    assert.ok(width <= 4096)
    assert.ok(height <= 4096)
    assert.ok(width * height <= 12_000_000)
  })
})
