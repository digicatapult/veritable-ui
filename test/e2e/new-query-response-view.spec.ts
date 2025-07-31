import { expect, Page, test } from '@playwright/test'
import { withBavQueryResponse, withCarbonQueryResponse } from '../helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('Query response view', () => {
  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    await cleanup([AliceHost, BobHost])
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
    await withConnection(AliceHost, BobHost)
  })

  test.afterAll(async () => {
    await cleanup([AliceHost, BobHost])
    await page.close()
  })

  test('renders CO2 query response with correct emissions', async () => {
    await withCarbonQueryResponse(AliceHost, BobHost, 20)

    await test.step('visits queries page and clicks on "view response" (Alice)', async () => {
      await page.goto(`${AliceHost}/queries`)

      expect(page.getByText('OFFSHORE RENEWABLE ENERGY CATAPULT')).toBeVisible()
      expect(page.getByText('Total Carbon Embodiment')).toBeVisible()
      expect(page.getByText('View Response')).not.toBeDisabled()
      await page.getByText('View Response').click({ delay: 500 })
    })

    await test.step('render correct CO2 emissions', async () => {
      expect(page.url()).toContain(`${AliceHost}/queries`)
      const table = page.getByRole('table')

      await expect(table.getByText('CO2e')).toContainText('20')
      expect(page.getByRole('heading', { name: 'Query Information' })).toBeVisible()
      const button = page.getByText('Back To Queries')
      await expect(button).not.toBeDisabled()
      await expect(button).toBeVisible()
      await button.click({ delay: 500 })
    })

    await test.step('returns to queries page', async () => {
      expect(page.url()).toContain(`${AliceHost}/queries`)
      expect(page.getByText('Total Carbon Embodiment')).toBeVisible()
      expect(page.getByText('View Response')).not.toBeDisabled()
    })
  })

  test('renders BAV query response with correct bank details', async () => {
    const countryCode = 'GB'
    const name = 'Company name'
    const accountId = '12345678'
    const clearingSystemId = '123456'
    await withBavQueryResponse(AliceHost, BobHost, countryCode, name, accountId, clearingSystemId)

    await test.step('visits queries page and clicks on "view response" (Alice)', async () => {
      await page.goto(`${AliceHost}/queries`)

      expect(page.getByText('OFFSHORE RENEWABLE ENERGY CATAPULT')).toBeVisible()
      expect(page.getByText('Beneficiary Account Validation')).toBeVisible()
      expect(page.getByText('View Response')).not.toBeDisabled()
      await page.getByText('View Response').click({ delay: 500 })
    })

    await test.step('render correct bank details', async () => {
      expect(page.url()).toContain(`${AliceHost}/queries`)
      const table = page.getByRole('table')

      await expect(table.locator('tr', { hasText: 'Country' })).toContainText('United Kingdom')
      await expect(table.locator('tr', { hasText: /^Name:/ })).toContainText(name)
      await expect(table.locator('tr', { hasText: 'Account ID' })).toContainText(accountId)
      await expect(table.locator('tr', { hasText: 'Clearing System ID' })).toContainText(clearingSystemId)
      expect(page.getByRole('heading', { name: 'Query Information' })).toBeVisible()
    })

    await test.step('verify bank details', async () => {
      const table = page.getByRole('table')
      await expect(table.locator('tr', { hasText: 'Description' })).toContainText('Awaiting request')

      const verifyButton = page.locator('#bav-verify-button')
      await expect(verifyButton).toBeVisible()
      await verifyButton.click()

      await expect(table.locator('tr', { hasText: 'Description' })).toContainText('Partial Match')
      expect(page.getByText('Send new query')).toBeVisible()
    })

    await test.step('returns to queries page', async () => {
      const button = page.getByText('Back To Queries')
      await expect(button).not.toBeDisabled()
      await expect(button).toBeVisible()
      await button.click({ delay: 500 })
      expect(page.url()).toContain(`${AliceHost}/queries`)
      expect(page.getByText('Beneficiary Account Validation')).toBeVisible()
      expect(page.getByText('View Response')).not.toBeDisabled()
    })
  })
})
