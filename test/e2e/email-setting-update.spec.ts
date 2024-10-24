import { Page, test } from '@playwright/test'
import { CustomBrowserContext, withCleanAlice, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn'

test.describe('Updating Settings - email', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'

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

  test('Connection from Alice to Bob', async () => {
    test.setTimeout(100000)

    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]')
    await page.waitForURL(`${baseUrlAlice}/settings`)

    await page.waitForSelector('input.edit-button')
    await page.click('input.edit-button')
  })
})
