import { randomUUID } from 'node:crypto'

import { BrowserContext, expect, Page } from '@playwright/test'
import { fetchDel } from '../helpers/routeHelper'

export interface CustomBrowserContext extends BrowserContext {
  username?: string
}

export async function cleanup(urls: string[]) {
  const results = await Promise.allSettled(urls.map((url) => fetchDel(url)))

  const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} Cleanup URLs were rejected with Error: ${rejected[0]}`)
  }

  if (!fulfilled.every((res) => res.ok)) {
    throw new Error('Error resetting application or deleting emails from smtp4dev')
  }
}

export async function withRegisteredAccount(page: Page, context: CustomBrowserContext, loginUrl: string) {
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'

  const expectedKeycloakUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`

  await page.goto(loginUrl)
  await page.waitForLoadState('networkidle')
  expect(page.url()).toContain(expectedKeycloakUrl)

  const button = page.locator('a[href*="/realms/veritable/login-actions/registration"]')
  await expect(button).toBeVisible()
  await button.click({ delay: 100 })
  await page.waitForLoadState('networkidle')

  context.username = `user-${randomUUID()}`

  await page.fill('#username', context.username)
  await page.fill('#password', 'password')
  await page.fill('#password-confirm', 'password')
  await page.fill('#email', `${context.username}@testmail.com`)
  await page.fill('#firstName', 'name')
  await page.fill('#lastName', 'lastname')
  const submitButton = page.locator('input[type="submit"][value="Register"]')
  await expect(submitButton).toBeVisible()
  await submitButton.click({ delay: 100 })
  await page.waitForLoadState('networkidle')
}

export async function withLoggedInUser(page: Page, context: CustomBrowserContext, loginUrl: string) {
  const baseKeycloakUrl = process.env.VERITABLE_KEYCLOAK_URL_PREFIX || 'http://localhost:3080'
  const expectedKeycloakUrl = `${baseKeycloakUrl}/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http`
  await page.goto(loginUrl)
  await page.waitForLoadState('networkidle')
  const inviteUrl = page.url()
  if (!context.username) {
    throw new Error(`username was not found`)
  }
  if (inviteUrl.includes(expectedKeycloakUrl)) {
    await page.fill('#username', context.username)
    await page.fill('#password', 'password')
    await page.click('input[type="submit"][value="Sign In"]', { delay: 100 })
    await page.waitForLoadState('networkidle')
  }
}
