import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn'

test.describe('Homepage and homepage related tests', () => {
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'
  const keycloakUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`
  const baseUrl = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  let page: Page
  let context: CustomBrowserContext

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await cleanup([baseUrl])
    await page.close()
  })

  test('redirects to keycloak', async () => {
    await page.goto(baseUrl)

    const url = page.url()
    expect(url).toContain(keycloakUrl)

    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.03 })
  })

  test.describe('after successful login', async () => {
    test.beforeEach(async () => {
      await withRegisteredAccount(page, context, baseUrl)
      await withLoggedInUser(page, context, baseUrl)
    })

    test('renders a home page', async () => {
      await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.03 })
    })
  })
})
