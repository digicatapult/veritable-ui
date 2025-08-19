import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'

test.describe('Redirect to about page', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await cleanup([baseUrlAlice])
    await page.close()
    await context.close()
  })

  test('Redirect to about page', async () => {
    await page.waitForSelector('a[href="/about"]')
    await page.click('a[href="/about"]')
    await page.waitForURL(`${baseUrlAlice}/about`)

    const aboutText = page.locator('#about-container')
    await expect(aboutText).toContainText('Veritable is a platform that enhances trust and transparency')
    expect(aboutText).toContainText('Enables seamless data requests and responses')
    expect(aboutText).toContainText('Manages and verifies digital credentials for compliance')
  })
})
