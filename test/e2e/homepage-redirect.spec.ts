import { expect, test } from '@playwright/test'

test('homepage redirect', async ({ page }) => {
  await page.goto('http://localhost:3000')

  const url = page.url()
  expect(url).toContain(
    'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
  )
})
