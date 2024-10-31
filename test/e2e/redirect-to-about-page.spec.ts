import { expect, Page, test } from '@playwright/test'
import { CustomBrowserContext, withCleanAlice, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn'

test.describe('Redirect to about page', () => {
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

  test('Redirect to about page', async () => {
    test.setTimeout(100000)

    await page.waitForSelector('a[href="/about"]')
    await page.click('a[href="/about"]')
    await page.waitForURL(`${baseUrlAlice}/about`)

    const aboutPage = await page.$('#about-container')
    const aboutText = await aboutPage?.textContent()
    expect(aboutText).toContain(
      'Veritable is a platform that enhances trust and transparency in supply chains through secure, privacy-preserving data sharing and process automation. With verified digital identities, automated queries, and credential management, Veritable enables verified participants to collaborate with confidence, safeguarding sensitive information and ensuring compliance'
    )
    expect(aboutText).toContain('Enables seamless data requests and responses')
    expect(aboutText).toContain('Manages and verifies digital credentials for compliance')
  })
})
