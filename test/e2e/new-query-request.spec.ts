import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe('New query request', () => {
  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  let context: CustomBrowserContext
  let page: Page

  test.beforeAll(async () => {
    await cleanup([AliceHost, BobHost])
  })

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
    await withConnection(AliceHost, BobHost)
  })

  test.afterEach(async () => {
    await cleanup([AliceHost, BobHost])
    await page.close()
  })

  test('creates total carbon embodiment query (Alice)', async () => {
    await test.step('creates a new query request for total co2 emissions', async () => {
      await page.goto(`${AliceHost}/queries`)
      await page.click('text=Query Request')

      const queryTypes = page.locator('.query-item')
      expect(queryTypes.nth(0)).not.toHaveClass('query-item disabled')
      expect(queryTypes.nth(1)).toHaveClass('query-item disabled')
      expect(queryTypes.nth(2)).toHaveClass('query-item disabled')
      expect(queryTypes.nth(3)).toHaveClass('query-item disabled')

      const co2Card = await page.$('a[href="/queries/new/scope-3-carbon-consumption"]')
      expect(await co2Card?.textContent()).toContain(
        'Total Carbon EmbodimentCreates a query for calculating the total carbon embodiment for a given product or component.'
      )
      await co2Card?.click()
    })

    await test.step('selects company from already established connections', async () => {
      expect(page.url()).toContain('/queries/new/scope-3-carbon-consumption')
      const aliceConnections = page.locator('#search-results')
      expect(await aliceConnections.textContent()).toContain('OFFSHORE RENEWABLE ENERGY CATAPULT')

      await page.waitForTimeout(3000)
      const checkbox = page.getByRole('checkbox')
      await expect(checkbox).not.toBeDisabled()
      await checkbox.check({ timeout: 20000 })
      await expect(checkbox).toBeChecked()

      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment' })).toBeVisible()
    })

    await test.step('enters product ID along with quantities and submits a new query request', async () => {
      expect(page.url()).toContain('/queries/new/scope-3-carbon-consumption')
      const content = page.locator('#content-main')
      await expect(content.locator(page.getByText('Choose the product'))).toHaveText(
        'Choose the product that you want to apply the query “What is the total carbon embodiment for the product/component below?” to.'
      )
      await page.getByPlaceholder('BX20001').fill('E2E-Product-id')
      await page.getByLabel('Quantity').fill('10')
      await page.getByRole('button', { name: 'Submit Query' }).click()

      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByRole('heading')).toContainText('Your Query has been sent!')
      expect(await successModal.textContent()).toContain(
        'Your Query has been sent!Your query has been successfully shared with the following supplier:OFFSHORE RENEWABLE ENERGY CATAPULTOnce all responses are received, the information will be automatically gathered and shared with you. No further action is needed on your part. You can trust that the process is secure, transparent, and streamlined for your convenience.You can check the status of your query in the Queries section of your dashboard.Back to Queries'
      )
    })

    await test.step('new query is visible on other node (Bob) and can be responded to', async () => {
      page.goto(`${BobHost}/queries`)
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
})
