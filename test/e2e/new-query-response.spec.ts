import { expect, Page, test } from '@playwright/test'
import { withBavQueryRequest, withCarbonQueryRequest } from '../helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { aliceE2E, bobE2E, withConnection } from '../helpers/setupConnection.js'
import { waitForHTMXSuccessResponse } from '../helpers/waitForHelper.js'

test.describe('New query response', () => {
  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(20000) // withConnection() can take 7sec to complete
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

  test.only('responds to a total carbon embodiment (CO2) query (Bob)', async () => {
    await withCarbonQueryRequest(aliceE2E.url)

    await test.step('visits queries page and clicks on "respond to query" (Bob)', async () => {
      await page.goto(`${bobE2E.url}/queries`, { waitUntil: 'networkidle' })
      await page.getByText('Respond to query').click({ delay: 50 })
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment Query' })).toBeVisible()
    })

    await test.step('enters emissions and submits a query response', async () => {
      await page.fill('#co2-embodiment-input', '200')

      await waitForHTMXSuccessResponse(page, () => page.locator('#partial-response-input-yes').click(), '/partial')
      await expect(page.getByText('Select which suppliers contributed to the carbon embodiment')).toBeVisible()
      await expect(page.getByPlaceholder('Value in kg CO2e (to be aggregated)')).toHaveValue('200')

      await waitForHTMXSuccessResponse(page, () => page.locator('#partial-response-input-no').click(), '/partial')
      await expect(page.getByText('Select which suppliers contributed to the carbon embodiment')).not.toBeVisible()
      await expect(page.getByPlaceholder('Value in kg CO2e (to be aggregated)')).toHaveValue('200')

      const button = page.getByRole('button', { name: 'Submit Response' })
      await expect(button).toBeVisible()
      await expect(button).not.toBeDisabled()
      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('updates query status to be resolved', async () => {
      const button = page.getByText('Back to Home')
      await expect(page.getByRole('heading', { name: 'Thank you for your response' })).toBeVisible()
      await expect(button).toBeVisible()
      await expect(button).not.toBeDisabled()
      await expect(page.getByText('The requester will verify your response')).toBeVisible()
      await expect(page.getByText('You can check the status')).toBeVisible()
      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('returns to home page', async () => {
      await expect(page.getByRole('heading', { name: 'Onboard/Refer' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Onboard/Refer' })).not.toBeDisabled()

      await expect(page.getByRole('heading', { name: 'Queries' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Queries' })).not.toBeDisabled()

      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeDisabled()

      await expect(page.getByRole('heading', { name: 'Credentials' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Credentials' })).not.toBeDisabled()
    })
  })

  test('responds to a Beneficiary Account Validation (BAV) query (Bob)', async () => {
    await withBavQueryRequest(aliceE2E.url)

    await test.step('visits queries page and clicks on "respond to query" (Bob)', async () => {
      await page.goto(`${bobE2E.url}/queries`, { waitUntil: 'networkidle' })
      await page.getByText('Respond to query').click({ delay: 50 })
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Beneficiary Account Validation Query' })).toBeVisible()
    })

    await test.step('enters bank details and submits a query response', async () => {
      await page.selectOption('#country-select', { label: 'United Kingdom' })

      await page.fill('#bav-name-input', 'Company Name')
      await page.fill('#bav-account-id-input', '12345678')
      await page.fill('#bav-clearing-system-id-input', '123456')
      const button = page.getByRole('button', { name: 'Submit Response' })
      await expect(button).toBeVisible()
      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('updates query status to be resolved', async () => {
      await expect(page.getByRole('heading', { name: 'Thank you for your response' })).toBeVisible()
      const button = page.getByText('Back to Home')
      await expect(button).toBeVisible()
      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })
  })
})
