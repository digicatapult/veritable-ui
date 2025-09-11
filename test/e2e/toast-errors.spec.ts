import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { waitFor500Response } from '../helpers/waitForHelper.js'

test.describe('Toast on error', () => {
  let context: CustomBrowserContext
  let page: Page

  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
  })

  test.afterAll(async () => {
    await cleanup([AliceHost, BobHost])
    await page.close()
    await context.close()
  })
  test('Asserting toast on bad company number', async () => {
    await page.goto(`${AliceHost}/connection/new`, { waitUntil: 'networkidle' })

    await page.locator('#new-invite-country-select').waitFor({ state: 'visible' })
    await page.selectOption('#new-invite-country-select', 'United Kingdom')
    await expect(page.locator('#new-invite-country-code-display')).toHaveValue('GB')

    await waitFor500Response(
      page,
      () => page.locator('#new-invite-company-number-input').pressSequentially('12345678', { delay: 100 }),
      '/verify-company?'
    )

    await expect(page.locator('#toast-container dialog')).toBeVisible()
    await expect(page.locator('#toast-container')).toContainText('Internal Error')
    await expect(page.locator('#toast-container')).toContainText('Please contact the technical team or try again later')
    await expect(page.locator('#toast-container')).toContainText('Error calling Companies House API')

    await page.selectOption('#new-invite-country-select', 'United States')

    await waitFor500Response(
      page,
        () => page.locator('#new-invite-company-number-input').pressSequentially('5001500', { delay: 100 }),
      '/verify-company?'
    )

    await expect(page.locator('#toast-container dialog')).toHaveCount(2)
    await expect(page.locator('#toast-container dialog').first()).toContainText('Internal Error')
    await expect(page.locator('#toast-container dialog').first()).toContainText(
      'Please contact the technical team or try again later'
    )
    await expect(page.locator('#toast-container dialog').first()).toContainText('Error calling New York State API')
  })
})
