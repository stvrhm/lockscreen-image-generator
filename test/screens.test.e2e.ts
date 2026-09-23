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

describe('a Device round trip', () => {
  it('creates, survives refresh, and moves through history in one document', async (t) => {
    let page = await open(t, routes.screens.home.href())
    await markDocument(page)

    await page.getByRole('link', { name: strings.start.new }).click()
    await expectScreen(page, strings.editor.titleNew)

    await page.getByLabel(/label/i).first().fill('Pixel 9 QA')
    await page.getByRole('button', { name: strings.editor.create }).click()
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

  it('duplicates and deletes from Browse', async (t) => {
    let page = await open(t, routes.screens.newDevice.href())
    await page.getByLabel(/label/i).first().fill('Pixel 9 QA')
    await page.getByRole('button', { name: strings.editor.create }).click()
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
