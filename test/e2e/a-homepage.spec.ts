import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext } from '../helpers/registerLogIn.js'
import { aliceE2E } from '../helpers/setupConnection.js'

test.describe('Homepage redirect', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterEach(async () => {
    await cleanup([aliceE2E.url])
    await page.close()
    await context.close()
  })

  test('successful login redirect', async ({ page }) => {
    const expectedUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`
    await page.goto(aliceE2E.url, { waitUntil: 'networkidle' })
    expect(page.url()).toContain(expectedUrl)
  })
})
