import { expect, Page, test } from '@playwright/test'
import { withQueryRequest } from './helpers/query.js'
import {
  CustomBrowserContext,
  withCleanAliceBobEmail,
  withLoggedInUser,
  withRegisteredAccount,
} from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe('New query response', () => {
  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'
  const smtp4dev = process.env.VERITABLE_SMTP_ADDRESS || 'http://localhost:5001'

  let context: CustomBrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    await withCleanAliceBobEmail(AliceHost, BobHost, smtp4dev)
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, AliceHost)
    await withLoggedInUser(page, context, AliceHost)
    await withConnection(AliceHost, BobHost)
    await withQueryRequest(AliceHost)
  })

  test.afterAll(async () => {
    await withCleanAliceBobEmail(AliceHost, BobHost, smtp4dev)
    await page.close()
  })

  test('responds to total carbon embodiment query (Bob)', async () => {
    await test.step('visits queries page and clicks on "respond to query" (Bob)', async () => {
      await page.goto(`${BobHost}/queries`)
      await page.getByText('Respond to query').click()

      const topHeading = page.getByRole('heading', { name: 'Select' })
      const formHeading = page.getByRole('heading', { name: 'Total' })
      await expect(topHeading).toContainText('Select Company To Send Your Query To')
      await expect(formHeading).toContainText('Total Carbon Embodiment')
      expect(page.url()).toContain(`${BobHost}/queries/scope-3-carbon-consumption`)
    })

    await test.step('enters emissions and submits a query response', async () => {})

    await test.step('updates query status to be resolved', async () => {})
  })
})
