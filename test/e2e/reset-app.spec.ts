import { expect, Page, test } from '@playwright/test'
import 'reflect-metadata'
import {
  CustomBrowserContext,
  withCleanAlice,
  withCleanAliceBobEmail,
  withLoggedInUser,
  withRegisteredAccount,
} from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe('Resetting app', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'
  const smtp4devUrl = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
  })
  test.beforeEach(async () => {
    await withCleanAlice(baseUrlAlice)
    page = await context.newPage()
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await withCleanAlice(baseUrlAlice)
    await page.close()
  })
  test.beforeEach(async () => {
    await withCleanAliceBobEmail(baseUrlAlice, baseUrlBob, smtp4devUrl)
    await withCleanAlice(baseUrlAlice)
    page = await context.newPage()
    await withLoggedInUser(page, context, baseUrlAlice)

    await withConnection()
  })

  test('Reset all on Alice', async () => {
    test.setTimeout(100000)
    await test.step('Check there is a connection', async () => {
      await page.goto(`${baseUrlAlice}`)
      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      await page.waitForSelector('div.list-item-status[data-status="disabled"]')
      const statusText = await page.textContent('div.list-item-status[data-status="disabled"]')
      expect(statusText).toContain('Unverified')
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
