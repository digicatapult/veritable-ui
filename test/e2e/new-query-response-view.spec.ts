import { expect, Page, test } from '@playwright/test'
import { withBavQueryResponse, withCarbonQueryResponse } from '../helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { aliceE2E, bobE2E, withConnection } from '../helpers/setupConnection.js'

test.describe('Query response view', () => {
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

  test('renders CO2 query response with correct emissions', async () => {
    await withCarbonQueryResponse(aliceE2E.url, bobE2E.url, 20)

    await test.step('visits queries page and clicks on "view response" (Alice)', async () => {
      await page.goto(`${aliceE2E.url}/queries`, { waitUntil: 'networkidle' })

      await expect(page.getByText(bobE2E.companyName)).toBeVisible()
      await expect(page.getByText('Total Carbon Embodiment')).toBeVisible()
      const viewResponse = page.getByText('View Response')
      await expect(viewResponse).toBeVisible()
      await viewResponse.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('render correct CO2 emissions', async () => {
      await expect(page.getByRole('heading', { name: 'Query Information' })).toBeVisible()
      await expect(page.getByRole('cell', { name: 'CO2e' })).toContainText('20')

      const button = page.getByText('Back To Queries')
      await expect(button).toBeVisible()
      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('returns to queries page', async () => {
      await expect(page.getByText('Total Carbon Embodiment')).toBeVisible()
      await expect(page.getByText('View Response')).not.toBeDisabled()
    })
  })

  test('renders BAV query response with correct bank details', async () => {
    const countryCode = 'GB'
    const name = 'Company name'
    const accountId = '12345678'
    const clearingSystemId = '123456'
    await withBavQueryResponse(aliceE2E.url, bobE2E.url, countryCode, name, accountId, clearingSystemId)

    await test.step('visits queries page and clicks on "view response" (Alice)', async () => {
      await page.goto(`${aliceE2E.url}/queries`, { waitUntil: 'networkidle' })

      await expect(page.getByText(bobE2E.companyName)).toBeVisible()
      await expect(page.getByText('Beneficiary Account Validation')).toBeVisible()
      await expect(page.getByText('View Response')).not.toBeDisabled()
      await page.getByText('View Response').click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('render correct bank details', async () => {
      await expect(page).toHaveURL(new RegExp(`${aliceE2E.url}/queries.*`))

      const table = page.getByRole('table')
      await expect(table.locator('tr', { hasText: 'Country' })).toContainText('United Kingdom')
      await expect(table.locator('tr', { hasText: /^Company Name:/ })).toContainText(name)
      await expect(table.locator('tr', { hasText: 'Account ID' })).toContainText(accountId)
      await expect(table.locator('tr', { hasText: 'Clearing System ID' })).toContainText(clearingSystemId)
      await expect(page.getByRole('heading', { name: 'Response Information' })).toBeVisible()
    })

    await test.step('verify bank details', async () => {
      const table = page.getByRole('table')
      await expect(table.locator('tr', { hasText: 'Result' })).toContainText('Awaiting request')

      const verifyButton = page.locator('#bav-verify-button')
      await expect(verifyButton).toBeVisible()
      await verifyButton.click({ delay: 50 })

      await page.waitForLoadState('networkidle')
      await expect(table.locator('tr', { hasText: 'Result' })).toContainText('Partial Match')
      await expect(page.getByText('Request new BAV query')).toBeVisible()
    })

    await test.step('returns to queries page', async () => {
      const button = page.getByText('Back To Queries')
      await expect(button).toBeVisible()
      await button.click({ delay: 50 })

      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(new RegExp(`${aliceE2E.url}/queries.*`))
      await expect(page.getByText('Beneficiary Account Validation')).toBeVisible()
      await expect(page.getByText('View Response')).not.toBeDisabled()
    })
  })
})
