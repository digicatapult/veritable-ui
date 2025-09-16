import { expect, Page, test } from '@playwright/test'
import { expiresAt } from '../helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { aliceE2E, bobE2E, charlieE2E, withConnection } from '../helpers/setupConnection.js'
import { waitForHTMXSuccessResponse } from '../helpers/waitForHelper.js'

test.describe('New query request', () => {
  let context: CustomBrowserContext
  let page: Page

  const aliceToBobQuantity = 10
  const bobCO2 = 2
  const bobToCharlieQuantity = 5
  const charlieCO2 = 1
  // TODO: The total CO2 test is currently disabled due to a known issue (https://digicatapult.atlassian.net/browse/VR-497)
  // Re-enable this functionality when the issue is resolved
  // const totalCO2 = bobToCharlieQuantity * charlieCO2 + aliceToBobQuantity * bobCO2

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(15000) // withConnection() can take 7sec to complete
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, aliceE2E.url)
    await withLoggedInUser(page, context, aliceE2E.url)
    await withConnection(aliceE2E, bobE2E)
    await withConnection(bobE2E, charlieE2E)
  })

  test.afterEach(async () => {
    await cleanup([aliceE2E.url, bobE2E.url, charlieE2E.url])
    await page.close()
    await context.close()
  })

  test('creates a total carbon embodiment (CO2) query (Alice)', async () => {
    test.setTimeout(40000) // This entire workflow is quite long
    await test.step('creates a new query request for total co2 emissions', async () => {
      await page.goto(`${aliceE2E.url}/queries`, { waitUntil: 'networkidle' })
      await page.click('text=Query Request', { delay: 50 })

      const queryTypes = page.locator('.query-item')
      expect(queryTypes.nth(0)).not.toHaveClass('query-item disabled')
      expect(queryTypes.nth(1)).not.toHaveClass('query-item disabled')
      expect(queryTypes.nth(2)).toHaveClass('query-item disabled')
      expect(queryTypes.nth(3)).toHaveClass('query-item disabled')

      const co2Card = page.locator('a[href="/queries/new?type=total_carbon_embodiment"]')
      await expect(co2Card).toContainText('Total Carbon Embodiment')
      await co2Card.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('selects company from already established connections', async () => {
      const aliceConnections = page.locator('#search-results')
      await expect(aliceConnections).toContainText(bobE2E.companyName)

      const checkbox = page.getByRole('checkbox')
      await expect(checkbox).toBeVisible()
      await expect(checkbox).not.toBeDisabled()
      await checkbox.check()
      await expect(checkbox).toBeChecked()

      await page.getByRole('button', { name: 'Next' }).click({ delay: 50 })
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment Query' })).toBeVisible()
    })

    await test.step('enters product ID along with quantities and submits a new query request', async () => {
      const content = page.locator('#content-main')
      await expect(content.locator(page.getByText('Choose the product'))).toContainText(
        'Choose the product that you want to apply the query'
      )
      await page.getByPlaceholder('BX20001').fill('E2E-Product-id')
      await page.getByLabel('Quantity').fill(String(aliceToBobQuantity))
      await page.getByLabel('Request Deadline').fill(expiresAt)
      await page.getByRole('button', { name: 'Submit Query' }).click({ delay: 50 })
      await page.waitForLoadState('networkidle')

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Your Query has been sent!')
      await expect(successModal).toContainText(bobE2E.companyName)
    })

    await test.step('new query is visible on Bob and can be responded to', async () => {
      await page.goto(`${bobE2E.url}/queries`, { waitUntil: 'networkidle' })
      const queryRow = page.getByRole('table').getByRole('row', { name: aliceE2E.companyName })
      const button = queryRow.getByText('Respond to Query')

      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
      await expect(queryRow.getByText('Total Carbon Embodiment')).toBeVisible()
      await expect(queryRow.getByText('Received')).toBeVisible()
      await expect(queryRow.getByText('Pending Your Input')).toHaveClass('list-item-status')

      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('Bob sends a partial query to Charlie in his supply chain', async () => {
      await waitForHTMXSuccessResponse(page, () => page.locator('#partial-response-input-yes').click(), '/partial')
      await page.getByRole('checkbox', { name: 'select partial query' }).check()
      await page.getByRole('textbox', { name: 'Product ID' }).fill('E2E-Product-id-partial')
      await page.getByPlaceholder('Quantity').fill(String(bobToCharlieQuantity))
      await page.locator('#co2-embodiment-input').fill(String(bobCO2))

      const button = page.getByRole('button', { name: 'Submit Response' })
      await button.click({ delay: 50 })

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Thank you for your response!')
      await expect(successModal).toContainText(charlieE2E.companyName)
    })

    await test.step('new query is visible on Charlie and can be responded to', async () => {
      await page.goto(`${charlieE2E.url}/queries`, { waitUntil: 'networkidle' })
      const queryRow = page.getByRole('table').getByRole('row', { name: bobE2E.companyName })
      const button = queryRow.getByText('Respond to Query')

      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
      await expect(queryRow.getByText('Total Carbon Embodiment')).toBeVisible()
      await expect(queryRow.getByText('Received')).toBeVisible()
      await expect(queryRow.getByText('Pending Your Input')).toHaveClass('list-item-status')

      await button.click({ delay: 50 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('Charlie responds to the query', async () => {
      // TODO: The 'No' radio button is currently disabled due to a known issue (https://digicatapult.atlassian.net/browse/VR-487)
      // Re-enable this line when the issue is resolved
      // await page.getByRole('radio', { name: 'No' }).check()
      await page.locator('#co2-embodiment-input').fill(String(charlieCO2))

      const button = page.getByRole('button', { name: 'Submit Response' })
      await button.click({ delay: 50 })

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Thank you for your response!')
      await expect(successModal).toContainText(bobE2E.companyName)
    })

    await test.step('the query is Resolved on Charlie', async () => {
      await page.goto(`${charlieE2E.url}/queries`, { waitUntil: 'networkidle' })
      await expect(page.locator('div.list-item-status[data-status="success"]')).toHaveText('Resolved')
    })

    await test.step('the responses from Charlie and to Alice are Resolved on Bob', async () => {
      await page.goto(`${bobE2E.url}/queries`, { waitUntil: 'networkidle' })
      await expect(page.getByText('Resolved').first()).toHaveText('Resolved')
      await expect(page.getByText('Resolved').nth(1)).toHaveText('Resolved')
    })

    await test.step('the query is Resolved on Alice with the correct total CO2', async () => {
      await page.goto(`${aliceE2E.url}/queries`, { waitUntil: 'networkidle' })
      await expect(page.locator('div.list-item-status[data-status="success"]')).toHaveText('Resolved')
      const button = page.getByRole('link', { name: 'View Response' })
      await button.click({ delay: 50 })

      await page.waitForLoadState('networkidle')
      // await expect(page.getByRole('cell', { name: 'kg CO2e' })).toContainText(String(totalCO2))
    })
  })
})
