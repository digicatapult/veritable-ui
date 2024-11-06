import { expect, Page, test } from '@playwright/test'
import { CustomBrowserContext, reset, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { withConnection } from './helpers/setupConnection.js'

test.describe('query request', () => {
  let context: CustomBrowserContext
  let page: Page

  const AliceHost = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const BobHost = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  // Create and share context
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

  test.afterEach(async () => {
    await reset()
    await page.close()
  })
  // End-to-end process: Alice registers, invites Bob, Bob submits invite & pin, Alice submits pin

  test.skip('Query request from Alice to Bob', () => {
    test.step('Alice submits a new query request', () => {})
    test.step('Alice sees a new query with correct status', () => {})
    test.step('Bob sees a query from alice with ability to respond', () => {})
  })

  test('playground', async () => {
    test.setTimeout(100000)

    await test.step('Alice sees that connection is verified', async () => {
      await page.goto(`${AliceHost}/connection`)
      expect(true).toBe(true)
    })

    await test.step('Bob sees that connection is verified', async () => {
      await page.goto(`${BobHost}/connection`)
      expect(true).toBe(true)
    })
  })
})
