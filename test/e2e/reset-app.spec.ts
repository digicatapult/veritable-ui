import { expect, Page, test } from '@playwright/test'
import 'reflect-metadata'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('Resetting app', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(30000) // withConnection() can take 12sec to complete
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
    await withConnection(baseUrlAlice, baseUrlBob)
  })

  test.afterEach(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
    await page.close()
    await context.close()
  })

  test('Reset all on Alice', async () => {
    await test.step('Check there is a connection', async () => {
      await page.goto(`${baseUrlAlice}`, { waitUntil: 'networkidle' })

      const selector = page.getByRole('link', { name: 'connections', exact: true })
      await expect(selector).toBeVisible()
      await selector.click({ delay: 100 })
      await page.waitForLoadState('networkidle')

      const statusText = page.locator('div.list-item-status[data-status="success"]')
      await expect(statusText).toBeVisible()
      await expect(statusText).toContainText('Connected')
    })

    await test.step('Click reset on Alice', async () => {
      const selector = page.getByRole('link', { name: 'settings', exact: true })
      await expect(selector).toBeVisible()
      await selector.click({ delay: 100 })
      await page.waitForLoadState('networkidle')

      await page.waitForSelector('#reset-btn')
      const [response] = await Promise.all([
        page.waitForResponse((response) => response.url().includes('/reset') && response.status() === 200),
        page.click('#reset-btn', { delay: 100 }),
      ])
      expect(response.ok()).toBe(true)
    })

    await test.step('Check there are no connections on Alice', async () => {
      await page.goto(`${baseUrlAlice}/connection`, { waitUntil: 'networkidle' })
      await page.waitForSelector('text=No Connections for that search query. Try again or add a new connection')
    })
  })
})
