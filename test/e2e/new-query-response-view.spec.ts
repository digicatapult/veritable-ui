import { expect, Page, test } from '@playwright/test'
import { withQueryResponse } from './helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

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
    await withQueryResponse(AliceHost, BobHost, 20)
  })

  test.afterAll(async () => {
    await cleanup([AliceHost, BobHost])
    await page.close()
  })

  test('renders CO2 query response with correct emissions', async () => {
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

    await test.step('returns to home page', async () => {
      expect(page.url()).toContain(`${AliceHost}/queries`)
      expect(page.getByText('Total Carbon Embodiment')).toBeVisible()
      expect(page.getByText('View Response')).not.toBeDisabled()
    })
  })
})