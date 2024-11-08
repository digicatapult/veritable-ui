import { expect, Page, test } from '@playwright/test'
import 'reflect-metadata'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe('Resetting app', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  test.beforeAll(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
  })

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
    await withConnection(baseUrlAlice, baseUrlBob)
  })

  test.afterEach(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
    await page.close()
  })

  test('Reset all on Alice', async () => {
    await test.step('Check there is a connection', async () => {
      await page.goto(`${baseUrlAlice}/connection`)
      const statusText = await page.textContent('div.list-item-status[data-status="success"]')
      expect(statusText).toContain('Connected')
    })

    await test.step('Click reset on Alice', async () => {
      await page.click('a[href="/settings"]')
      await page.waitForURL(`${baseUrlAlice}/settings`)
      await page.click('#reset-btn')
    })

    await test.step('Check there are no connections on Alice', async () => {
      await page.goto(`${baseUrlAlice}/connection`)
      await page.reload()
      await page.waitForSelector('text=No Connections for that search query. Try again or add a new connection')
    })
  })
})
