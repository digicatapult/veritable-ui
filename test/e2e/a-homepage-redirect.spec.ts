import { expect, test } from '@playwright/test'

test('homepage redirect', async ({ page }) => {
  const baseUrl = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'
  const expectedUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`

  await page.goto(baseUrl)

  const url = page.url()
  expect(url).toContain(expectedUrl)
})
