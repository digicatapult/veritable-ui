import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'

test.describe('Updating Settings - email', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'

  test.beforeAll(async () => {
    await cleanup([baseUrlAlice])
  })
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await cleanup([baseUrlAlice])
    await page.close()
  })

  test('Update admin email on alice', async () => {
    test.setTimeout(100000)

    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]')
    await page.waitForURL(`${baseUrlAlice}/settings`)

    await page.waitForSelector('input.edit-button')
    await page.click('input.edit-button')

    await page.focus('#admin_email')
    await page.fill('#admin_email', 'sometestmail@test.com')

    await page.click('button[data-variant="outlined"][name="action"][value="updateSettings"]')
    const emailValue = await page.inputValue('#admin_email')
    expect(emailValue).toBe('sometestmail@test.com')

    const changedEmailValue = await page.inputValue('#admin_email')
    expect(changedEmailValue).toContain('sometestmail@test.com')
  })
})
