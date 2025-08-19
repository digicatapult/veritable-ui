import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('New query request', () => {
  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(30000) // withConnection() can take 12sec to complete
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

  test('creates a total carbon embodiment (CO2) query (Alice)', async () => {
    await test.step('creates a new query request for total co2 emissions', async () => {
      await page.goto(`${AliceHost}/queries`, { waitUntil: 'networkidle' })
      await page.click('text=Query Request', { delay: 100 })

      const queryTypes = page.locator('.query-item')
      expect(queryTypes.nth(0)).not.toHaveClass('query-item disabled')
      expect(queryTypes.nth(1)).not.toHaveClass('query-item disabled')
      expect(queryTypes.nth(2)).toHaveClass('query-item disabled')
      expect(queryTypes.nth(3)).toHaveClass('query-item disabled')

      const co2Card = page.locator('a[href="/queries/new?type=total_carbon_embodiment"]')
      await expect(co2Card).toContainText('Total Carbon Embodiment')
      await co2Card.click({ delay: 100 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('selects company from already established connections', async () => {
      const aliceConnections = page.locator('#search-results')
      await expect(aliceConnections).toContainText('OFFSHORE RENEWABLE ENERGY CATAPULT')

      const checkbox = page.getByRole('checkbox')
      await expect(checkbox).toBeVisible()
      await expect(checkbox).not.toBeDisabled()
      await checkbox.check()
      await expect(checkbox).toBeChecked()

      await page.getByRole('button', { name: 'Next' }).click({ delay: 100 })
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment Query' })).toBeVisible()
    })

    await test.step('enters product ID along with quantities and submits a new query request', async () => {
      const content = page.locator('#content-main')
      await expect(content.locator(page.getByText('Choose the product'))).toContainText(
        'Choose the product that you want to apply the query'
      )
      await page.getByPlaceholder('BX20001').fill('E2E-Product-id')
      await page.getByLabel('Quantity').fill('10')
      await page.getByRole('button', { name: 'Submit Query' }).click({ delay: 100 })
      await page.waitForLoadState('networkidle')

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Your Query has been sent!')
      await expect(successModal).toContainText('OFFSHORE RENEWABLE ENERGY CATAPULT')
    })

    await test.step('new query is visible on other node (Bob) and can be responded to', async () => {
      await page.goto(`${BobHost}/queries`, { waitUntil: 'networkidle' })
      const queryRow = page.getByRole('table').getByRole('row', { name: 'DIGITAL CATAPULT' })
      const button = queryRow.getByText('Respond to Query')

      await expect(button).toBeVisible()
      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
      await expect(queryRow.getByText('Total Carbon Embodiment')).toBeVisible()
      await expect(queryRow.getByText('Received')).toBeVisible()
      await expect(queryRow.getByText('Pending Your Input')).toHaveClass('list-item-status')
    })
  })

  test('creates a Beneficiary Account Validation (BAV) query (Alice)', async () => {
    await test.step('creates a new query request for total BAV', async () => {
      await page.goto(`${AliceHost}/queries`, { waitUntil: 'networkidle' })
      await page.click('text=Query Request', { delay: 100 })
      await page.waitForLoadState('networkidle')

      const bavCard = page.locator('a[href="/queries/new?type=beneficiary_account_validation"]')
      await expect(bavCard).toContainText(`a query to verify a company's financial details`)
      await bavCard.click({ delay: 100 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('selects company from already established connections', async () => {
      const aliceConnections = page.locator('#search-results')
      await expect(aliceConnections).toContainText('OFFSHORE RENEWABLE ENERGY CATAPULT')

      const checkbox = page.getByRole('checkbox')
      await expect(checkbox).toBeVisible()
      await expect(checkbox).not.toBeDisabled()
      await checkbox.check()
      await expect(checkbox).toBeChecked()

      await page.getByRole('button', { name: 'Next' }).click({ delay: 100 })
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Beneficiary Account Validation Query' })).toBeVisible()
    })

    await test.step('submits a new BAV query request', async () => {
      await expect(page.locator('#content-main').getByText('Request financial details from')).toContainText(
        'OFFSHORE RENEWABLE ENERGY CATAPULT'
      )

      await page.getByRole('button', { name: 'Submit Query' }).click({ delay: 100 })

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Your Query has been sent!')
    })

    await test.step('new query is visible on other node (Bob) and can be responded to', async () => {
      await page.goto(`${BobHost}/queries`, { waitUntil: 'networkidle' })
      const queryRow = page.getByRole('table').getByRole('row', { name: 'DIGITAL CATAPULT' })
      const button = queryRow.getByText('Respond to Query')

      await expect(button).toBeVisible()
      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
      await expect(queryRow.getByText('Beneficiary Account Validation')).toBeVisible()
      await expect(queryRow.getByText('Received')).toBeVisible()
      await expect(queryRow.getByText('Pending Your Input')).toHaveClass('list-item-status')
    })
  })

  test('requests a query from connection page (Alice)', async () => {
    await test.step('creates a new query request from connections', async () => {
      await page.goto(`${AliceHost}/connection`, { waitUntil: 'networkidle' })
      await expect(page.locator('text=Send Query')).toBeVisible()
      await page.click('text=Send Query', { delay: 100 })
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(new RegExp(`${AliceHost}/queries/choose.*`))
      const bavCard = page.locator('a[href^="/queries/new?type=beneficiary_account_validation"]')
      await expect(bavCard).toBeVisible()
      await bavCard.click({ delay: 100 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('connection select page skipped - submits a new BAV query request', async () => {
      const content = page.locator('#content-main')
      await expect(content.locator(page.getByText('Request financial details from'))).toContainText(
        'Request financial details from OFFSHORE RENEWABLE ENERGY CATAPULT'
      )

      await page.getByRole('button', { name: 'Submit Query' }).click({ delay: 100 })
      await page.waitForLoadState('networkidle')

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Your Query has been sent!')
    })
  })
})
