import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('Disconnect connection', () => {
  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(15000) // withConnection() can take 7sec to complete
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
    await withConnection(AliceHost, BobHost)
  })

  test.afterEach(async () => {
    await cleanup([AliceHost, BobHost])
    await page.close()
    await context.close()
  })

  test('views a connection page (Bob)', async () => {
    await test.step('go to the profile page of an established connection', async () => {
      await page.goto(`${AliceHost}/connection`, { waitUntil: 'networkidle' })

      await page.click('a[href*="/connection/profile/"]:has-text("View Connection")')

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
    })
    await test.step('check profile page shows all expected info', async () => {
      await expect(page.getByRole('heading', { name: 'OFFSHORE RENEWABLE ENERGY' })).toBeVisible()
      await expect(page.getByText('GB')).toBeVisible()
      await expect(page.getByText('04659351')).toBeVisible()

      // Check connection status is visible and shows "Verified"
      await expect(page.locator('b.connection-status[data-status="success"]')).toBeVisible()
      await expect(page.getByText('Verified')).toBeVisible()

      // Check disconnect button and warning are visible
      await expect(page.locator('#disconnect-btn')).toBeVisible()
      await expect(page.getByText('Disconnect')).toBeVisible()
      await expect(page.locator('#disconnect-btn-warning')).toBeVisible()
      await expect(page.getByText('This action will revoke connection with OFFSHORE RENEWABLE')).toBeVisible()
    })

    await test.step('click disconnect button', async () => {
      await page.click('#disconnect-btn')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Are you sure you want to revoke connection with OFFSHORE RENEWABLE')).toBeVisible()
      await page.click('#disconnect-btn')
      await page.waitForLoadState('networkidle')
    })

    await test.step('check profile page shows all expected info', async () => {
      await expect(page.getByRole('heading', { name: 'OFFSHORE RENEWABLE ENERGY' })).toBeVisible()
      await expect(page.getByText('GB')).toBeVisible()
      await expect(page.getByText('04659351')).toBeVisible()

      // Check connection status is visible and shows "Verified"
      await expect(page.getByText('This connection has been')).toBeVisible()
      await expect(page.getByText('Disconnected', { exact: true })).toBeVisible()
    })
  })
})
