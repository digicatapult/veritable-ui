import { expect, Page, test } from '@playwright/test'
import version from '../../src/utils/version.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn'
import { aliceE2E } from '../helpers/setupConnection.js'

test.describe('Updating Settings - email', () => {
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

  test('Update admin email on alice', async () => {
    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]', { delay: 50 })
    await page.waitForURL(`${aliceE2E.url}/settings`)

    await page.waitForSelector('input.edit-button')
    await page.click('input.edit-button', { delay: 50 })

    await page.focus('#admin_email')
    await page.fill('#admin_email', 'sometestmail@test.com')

    await page.click('button[data-variant="outlined"][name="action"][value="updateSettings"]', { delay: 50 })
    const emailValue = await page.inputValue('#admin_email')
    expect(emailValue).toBe('sometestmail@test.com')

    const changedEmailValue = await page.inputValue('#admin_email')
    expect(changedEmailValue).toContain('sometestmail@test.com')
  })

  test('Check version id', async () => {
    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]', { delay: 50 })
    await page.waitForURL(`${aliceE2E.url}/settings`)

    await page.waitForSelector('#version-id')
    const versionId = await page.textContent('#version-id')
    expect(versionId).toContain(version)
  })
})
