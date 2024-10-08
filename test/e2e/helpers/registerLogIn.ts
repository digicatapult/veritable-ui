import { randomUUID } from 'node:crypto'

import { BrowserContext, expect, Page } from '@playwright/test'
import { get } from './routeHelpers'

export interface CustomBrowserContext extends BrowserContext {
  username?: string
}

export async function withCleanApp(urlAlice: string, urlBob: string, smtp4devUrl: string) {
  const results = await Promise.all([
    get(urlAlice, '/reset'),
    get(urlBob, '/reset'),
    fetch(`${smtp4devUrl}/api/Messages/*`, { method: 'delete' }), //updated for test
  ])
  if (!results.every((res) => res.ok)) {
    throw new Error('Error resetting application or deleting emails form smtp4dev')
  }
}

export async function withRegisteredAccount(page: Page, context: CustomBrowserContext, loginUrl: string) {
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'

  const expectedKeycloakUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`

  await page.goto(loginUrl)
  const url = page.url()
  expect(url).toContain(expectedKeycloakUrl)

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
  await page.waitForURL(loginUrl)
}

export async function withLoggedInUser(page: Page, context: CustomBrowserContext, loginUrl: string) {
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'
  const expectedKeycloakUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`
  await page.goto(loginUrl)
  const inviteUrl = page.url()
  if (!context.username) {
    throw new Error(`username was not found`)
  }
  if (inviteUrl.includes(expectedKeycloakUrl)) {
    await page.fill('#username', context.username)
    await page.fill('#password', 'password')
    await page.click('input[type="submit"][value="Sign In"]')
    await page.waitForURL(loginUrl)
  }
}
