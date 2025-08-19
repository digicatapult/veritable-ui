import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext } from '../helpers/registerLogIn.js'

test.describe('Homepage redirect', () => {
  let context: CustomBrowserContext
  let page: Page

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterEach(async () => {
    await cleanup([baseUrlAlice])
    await page.close()
    await context.close()
  })

  test('successful login redirect', async ({ page }) => {
    const expectedUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`
    await page.goto(baseUrlAlice, { waitUntil: 'load' })
    const url = page.url()
    expect(url).toContain(expectedUrl)
  })
})
