import { expect, Page, test } from '@playwright/test'
import 'reflect-metadata'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('Resetting app', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await page.close()
    await cleanup([baseUrlAlice, baseUrlBob])
  })
  test.beforeEach(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
    page = await context.newPage()
    await withLoggedInUser(page, context, baseUrlAlice)

    await withConnection(baseUrlAlice, baseUrlBob)
  })

  test('Reset all on Alice', async () => {
    test.setTimeout(100000)
    await test.step('Check there is a connection', async () => {
      await page.goto(`${baseUrlAlice}`)
      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      await page.waitForSelector('div.list-item-status[data-status="success"]')
      const statusText = await page.textContent('div.list-item-status[data-status="success"]')
      expect(statusText).toContain('Connected')
    })

    await test.step('Click reset on Alice', async () => {
      await page.waitForSelector('a[href="/settings"]')
      await page.click('a[href="/settings"]')
      await page.waitForURL(`${baseUrlAlice}/settings`)
      await page.waitForSelector('#reset-btn')
      await page.click('#reset-btn')
    })

    await test.step('Check there are no connections on Alice', async () => {
      await page.goto(`${baseUrlAlice}/connection`)
      await page.waitForURL('**/connection')
      await page.waitForSelector('text=No Connections for that search query. Try again or add a new connection')
    })
  })
})
