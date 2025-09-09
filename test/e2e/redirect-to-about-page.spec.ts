import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'

test.describe('Redirect to about page', () => {
  let context: CustomBrowserContext
  let page: Page

  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
  })

  test.afterEach(async () => {
    await cleanup([AliceHost])
    await page.close()
    await context.close()
  })

  test('Redirect to about page', async () => {
    const selector = page.locator('#veritable-logo')
    await expect(selector).toBeVisible()
    await selector.click({ delay: 100 })
    await page.waitForURL(`${AliceHost}/about`, { waitUntil: 'load' })

    const aboutText = page.locator('#about-container')
    await expect(aboutText).toContainText('Veritable is a platform that enhances trust and transparency')
  })
})
