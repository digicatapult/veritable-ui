import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { aliceE2E, bobE2E, withConnection } from '../helpers/setupConnection.js'

test.describe('Disconnect connection', () => {
  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(15000) // withConnection() can take 7sec to complete
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, aliceE2E.url)
    await withLoggedInUser(page, context, aliceE2E.url)
    await withConnection(aliceE2E, bobE2E)
  })

  test.afterEach(async () => {
    await cleanup([aliceE2E.url, bobE2E.url])
    await page.close()
    await context.close()
  })

  test('views a connection page (Bob)', async () => {
    await test.step('go to the profile page of an established connection', async () => {
      await page.goto(`${aliceE2E.url}/connection`, { waitUntil: 'networkidle' })

      await page.click('a[href*="/connection/profile/"]:has-text("View Connection")')

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
    })
    await test.step('check profile page shows all expected info', async () => {
      await expect(page.getByRole('heading', { name: bobE2E.companyName })).toBeVisible()
      await expect(page.getByText(String(bobE2E.registryCountryCode))).toBeVisible()
      await expect(page.getByText(bobE2E.companyNumber)).toBeVisible()

      // Check connection status is visible and shows "Verified"
      await expect(page.locator('b.connection-status[data-status="success"]')).toBeVisible()
      await expect(page.getByText('Verified')).toBeVisible()

      // Check disconnect button and warning are visible
      await expect(page.locator('#disconnect-button')).toBeVisible()
      await expect(page.getByText('Disconnect')).toBeVisible()
      await expect(page.locator('#disconnect-button-warning')).toBeVisible()
      await expect(page.getByText(`This action will revoke connection with ${bobE2E.companyName}`)).toBeVisible()
    })

    await test.step('click disconnect button', async () => {
      await page.click('#disconnect-button')
      await page.waitForLoadState('networkidle')
      await expect(
        page.getByText(`Are you sure you want to revoke connection with ${bobE2E.companyName}`)
      ).toBeVisible()
      await page.click('#final-disconnect-button')
      await page.waitForLoadState('networkidle')
    })

    await test.step('check profile page shows all expected info', async () => {
      await expect(page.getByRole('heading', { name: bobE2E.companyName })).toBeVisible()
      await expect(page.getByText(String(bobE2E.registryCountryCode))).toBeVisible()
      await expect(page.getByText(bobE2E.companyNumber)).toBeVisible()

      // Check connection status is visible and shows "Verified"
      await expect(page.getByText('This connection has been')).toBeVisible()
      await expect(page.getByText('Disconnected', { exact: true })).toBeVisible()
    })
  })
})
