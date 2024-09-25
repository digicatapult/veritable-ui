import { randomUUID } from 'node:crypto'

import { expect } from '@playwright/test'
import { get } from './routeHelpers'

export async function withCleanApp() {
  const results = await Promise.all([
    get('http://localhost:3000', '/reset'),
    get('http://localhost:3001', '/reset'),
    fetch('http://localhost:5000/api/Messages/*', { method: 'delete' }),
  ])
  if (!results.every((res) => res.ok)) {
    throw new Error('Error resetting application or deleting emails form smtp4dev')
  }
}

export async function withRegisteredAccount(page: any, context: any) {
  await page.goto('http://localhost:3000')
  const url = page.url()
  expect(url).toContain(
    'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
  )

  await page.waitForSelector('a[href*="/realms/veritable/login-actions/registration"]')
  await page.click('a[href*="/realms/veritable/login-actions/registration"]')
  await page.waitForURL('**/realms/veritable/login-actions/registration**')

  context.username = `user-${randomUUID()}`

  await page.fill('#username', context.username)
  await page.fill('#password', 'password')
  await page.fill('#password-confirm', 'password')
  await page.fill('#email', `${context.username}@testmail.com`)
  await page.fill('#firstName', 'name')
  await page.fill('#lastName', 'lastname')
  await page.click('input[type="submit"][value="Register"]')
  await page.waitForURL('http://localhost:3000')
}

export async function withLoggedInUser(page: any, context: any) {
  await page.goto('http://localhost:3000')
  const inviteUrl = page.url()
  if (
    inviteUrl.includes(
      'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
    )
  ) {
    await page.fill('#username', context.username)
    await page.fill('#password', 'password')
    await page.click('input[type="submit"][value="Sign In"]')
    await page.waitForURL('http://localhost:3000')
  }
}
