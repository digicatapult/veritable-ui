import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'
import { aliceE2E } from '../helpers/setupConnection'

test.describe('Redirect to about page', () => {
  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, aliceE2E.url)
    await withLoggedInUser(page, context, aliceE2E.url)
  })

  test.afterEach(async () => {
    await cleanup([aliceE2E.url])
    await page.close()
    await context.close()
  })

  test('Redirect to about page', async () => {
    const selector = page.locator('#veritable-logo')
    await expect(selector).toBeVisible()
    await selector.click({ delay: 50 })
    await page.waitForURL(`${aliceE2E.url}/about`, { waitUntil: 'load' })

    const aboutText = page.locator('#about-container')
    await expect(aboutText).toContainText('Veritable is a platform that enhances trust and transparency')
  })
})
