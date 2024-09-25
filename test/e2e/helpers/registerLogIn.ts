import { expect } from '@playwright/test'

export async function withRegisteredAccount(page: any) {
  await page.goto('http://localhost:3000')
  const url = page.url()
  expect(url).toContain(
    'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
  )

  await page.waitForSelector('a[href*="/realms/veritable/login-actions/registration"]')
  await page.click('a[href*="/realms/veritable/login-actions/registration"]')
  await page.waitForURL('**/realms/veritable/login-actions/registration**')

  await page.fill('#username', 'name')
  await page.fill('#password', 'password')
  await page.fill('#password-confirm', 'password')
  await page.fill('#email', 'email@testmail.com')
  await page.fill('#firstName', 'name')
  await page.fill('#lastName', 'lastname')
  await page.click('input[type="submit"][value="Register"]')
  await page.waitForURL('http://localhost:3000')
}

export async function withLoggedInUser(page: any) {
  await page.goto('http://localhost:3000')
  const inviteUrl = page.url()
  if (
    inviteUrl.includes(
      'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
    )
  ) {
    await page.fill('#username', 'name')
    await page.fill('#password', 'password')
    await page.click('input[type="submit"][value="Sign In"]')
    await page.waitForURL('http://localhost:3000')
  }
}
