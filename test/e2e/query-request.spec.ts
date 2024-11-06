import { expect, Page, test } from '@playwright/test'
import { CustomBrowserContext, reset, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe.only('Queries', () => {
  test.setTimeout(10000)
  let context: CustomBrowserContext
  let page: Page

  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  // Create and share context
  // TODO expand on assertations
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.beforeEach(async () => {
    await reset()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
    await withConnection(AliceHost, BobHost)
  })

  test.afterAll(async () => {
    await reset()
    await page.close()
  })

  test('Total CO2 request from Alice to Bob', async () => {
    await test.step('creates a new Query Request for total co2 emissions', async () => {
      await page.goto(`${AliceHost}/queries`)
      await page.click('text=Query Request')

      const queryTypes = page.locator('.query-item')
      expect((await queryTypes.all()).length).toBe(4)
      expect(queryTypes.nth(1)).toHaveClass('query-item disabled')
      expect(queryTypes.nth(2)).toHaveClass('query-item  disabled')
      expect(queryTypes.nth(3)).toHaveClass('query-item  disabled')

      const co2Card = await page.$('a[href="/queries/new/scope-3-carbon-consumption"]')
      expect(await co2Card?.textContent()).toContain('Total Carbon EmbodimentCreates a query for calculating the total carbon embodiment for a given product or component.')
      await co2Card?.click()
    })

    await test.step('selects company from already established connections', async () => {
      expect(page.url()).toContain('/queries/new/scope-3-carbon-consumption')
      const aliceConnections = page.locator('#search-results')
      expect(await aliceConnections.textContent()).toContain('OFFSHORE RENEWABLE ENERGY CATAPULT')

      const checkbox = page.getByRole('checkbox')
      await expect(checkbox).not.toBeChecked()
      await checkbox.check()
      await expect(checkbox).toBeChecked()

      await page.getByRole('button', { name: 'Next' }).click()
      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment' })).toBeVisible()
    })

    await test.step('enters product ID along with quantities and submits a new query request', async () => {
      expect(page.url()).toContain('/queries/new/scope-3-carbon-consumption')
      const content = page.locator('#content-main')
      await expect(content.locator(page.getByText('Choose the product'))).toHaveText("Choose the product that you want to apply the query “What is the total carbon embodiment for the product/component below?” to.")
      await page.getByPlaceholder('BX20001').fill('E2E-Product-id')
      await page.getByLabel('Quantity').fill('10')
      await page.getByRole('button', { name: 'Submit Query' }).click()

      expect(content.locator(page.getByRole('heading')))
      const successModal = page.locator('#new-query-confirmation-text')
      await expect(successModal).toBeVisible()
      await expect(successModal.getByText('Your query has been successfully shared with the following supplier:')).toBeVisible()
      await expect(successModal.getByText('OFFSHORE RENEWABLE ENERGY')).toBeVisible()
      await expect(successModal.getByText('You can check the status of')).toBeVisible()
    })

    await test.step('newly query is visible on other node', async () => {
      page.goto(`${BobHost}/queries`)
      const queriesTable = page.getByRole('table').and(page.getByText('DIGITAL'))

      await expect(queriesTable.getByRole('button', { name: 'Respond to query' })).toBeVisible()
    })
  })
})
