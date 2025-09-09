import { expect, Page, test } from '@playwright/test'
import version from '../../src/utils/version.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'

test.describe('Updating Settings - email', () => {
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

  test('Update admin email on alice', async () => {
    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]', { delay: 100 })
    await page.waitForURL(`${AliceHost}/settings`)

    await page.waitForSelector('input.edit-button')
    await page.click('input.edit-button', { delay: 100 })

    await page.focus('#admin_email')
    await page.fill('#admin_email', 'sometestmail@test.com')

    await page.click('button[data-variant="outlined"][name="action"][value="updateSettings"]', { delay: 100 })
    const emailValue = await page.inputValue('#admin_email')
    expect(emailValue).toBe('sometestmail@test.com')

    const changedEmailValue = await page.inputValue('#admin_email')
    expect(changedEmailValue).toContain('sometestmail@test.com')
  })

  test('Check version id', async () => {
    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]', { delay: 100 })
    await page.waitForURL(`${AliceHost}/settings`)

    await page.waitForSelector('#version-id')
    const versionId = await page.textContent('#version-id')
    expect(versionId).toContain(version)
  })
})
