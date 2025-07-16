import { expect, Page, test } from '@playwright/test'
import { withBavQueryRequest, withCarbonQueryRequest } from '../helpers/query.js'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { withConnection } from '../helpers/setupConnection.js'

test.describe('New query response', () => {
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

  test('responds to a total carbon embodiment (CO2) query (Bob)', async () => {
    await withCarbonQueryRequest(AliceHost)
    await test.step('visits queries page and clicks on "respond to query" (Bob)', async () => {
      await page.goto(`${BobHost}/queries`)
      await page.getByText('Respond to query').click()

      await expect(page.getByRole('heading', { name: 'Total Carbon Embodiment Query' })).toBeVisible()
    })

    await test.step('enters emissions and submits a query response', async () => {
      await page.fill('#co2-embodiment-input', '200')
      await expect(page.getByRole('button', { name: 'Submit Response' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Submit Response' })).not.toBeDisabled()
      await page.getByRole('button', { name: 'Submit Response' }).click()
    })

    await test.step('updates query status to be resolved', async () => {
      const button = page.getByText('Back to Home')
      await expect(page.getByRole('heading', { name: 'Thank you for your response' })).toBeVisible()
      await expect(button).toBeVisible()
      await expect(button).not.toBeDisabled()
      await expect(page.getByText('Once all supplier responses are received')).toBeVisible()
      await expect(page.getByText('You can check the status')).toBeVisible()
      await button.click({ delay: 500 })
    })

    await test.step('returns to home page', async () => {
      expect(page.url()).toContain(BobHost)
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
    await withBavQueryRequest(AliceHost)
    await test.step('visits queries page and clicks on "respond to query" (Bob)', async () => {
      await page.goto(`${BobHost}/queries`)
      await page.getByText('Respond to query').click()

      await expect(page.getByRole('heading', { name: 'Beneficiary Account Validation Query' })).toBeVisible()
    })

    await test.step('enters emissions and submits a query response', async () => {
      await page.fill('#bav-bic-input', 'AAAABBCC123')
      await page.selectOption('#country-select', { label: 'United Kingdom' })
      await expect(page.getByRole('button', { name: 'Submit Response' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Submit Response' })).not.toBeDisabled()
      await page.getByRole('button', { name: 'Submit Response' }).click()
    })

    await test.step('updates query status to be resolved', async () => {
      const button = page.getByText('Back to Home')
      await expect(page.getByRole('heading', { name: 'Thank you for your response' })).toBeVisible()
      await expect(button).toBeVisible()
      await expect(button).not.toBeDisabled()
      await expect(page.getByText('Once all supplier responses are received')).toBeVisible()
      await expect(page.getByText('You can check the status')).toBeVisible()
      await button.click({ delay: 500 })
    })
  })
})
