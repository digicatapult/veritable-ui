import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { aliceE2E, charlieE2E } from '../helpers/setupConnection.js'
import { checkEmails, clearSmtp4devMessages, extractInvite, extractPin } from '../helpers/smtpEmails.js'

test.describe('Connection via NY State Registry', () => {
  let context: CustomBrowserContext
  let page: Page
  let invite: string | null
  let pinForCharlie: string
  let pinForAlice: string

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, aliceE2E.url)
    await withLoggedInUser(page, context, aliceE2E.url)
  })

  test.afterAll(async () => {
    await cleanup([aliceE2E.url, charlieE2E.url])
    await page.close()
    await context.close()
  })

  test('Connection from Alice to Charlie', async () => {
    await test.step('Alice invites Charlie to connect', async () => {
      await page.goto(`${aliceE2E.url}`, { waitUntil: 'networkidle' })
      await page.click('a[href="/connection"]', { delay: 50 })
      await page.waitForLoadState('networkidle')

      const button = page.getByRole('link', { name: 'Invite New Connection' })
      await expect(button).toBeVisible()
      await button.click({ delay: 50 })
      await page.locator('#new-invite-country-select').waitFor({ state: 'visible' })
      await page.selectOption('#new-invite-country-select', 'United States')
      await expect(page.locator('#new-invite-country-code-display')).toHaveValue(charlieE2E.registryCountryCode)

      const companyNumber = charlieE2E.companyNumber

      await page.locator('#new-invite-company-number-input').pressSequentially(companyNumber, { delay: 50 })
      await page.fill('#new-invite-email-input', 'alice@testmail.com')

      const feedbackElement = page.locator('#new-connection-feedback')
      // waits for the Socrata API
      await expect(feedbackElement).toContainText(charlieE2E.address!)
      await page.click('button[type="submit"][name="action"][value="continue"]', { delay: 50 })

      const confirmationElement = page.locator('#new-connection-confirmation-text')
      await expect(confirmationElement).toContainText(`Company Number: ${charlieE2E.companyNumber}`)

      await page.click('button[type="submit"][name="action"][value="submit"]', { delay: 50 })
      await expect(confirmationElement).toContainText('Your connection invitation has been sent')
    })

    await test.step('Retrieve invite and pin for Charlie', async () => {
      const adminEmail = await checkEmails('admin@veritable.com')
      const inviteEmail = await checkEmails('alice@testmail.com')

      const extractedPin = await extractPin(adminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN for Charlie was not found.')
      pinForCharlie = extractedPin
      invite = await extractInvite(inviteEmail.id)
      if (!invite) throw new Error('Invitation for Charlie was not found.')
      await clearSmtp4devMessages()
    })

    await test.step('Charlie submits invite and pin', async () => {
      if (!invite) throw new Error('Invitation for Charlie was not found.')
      await page.goto(`${charlieE2E.url}/connection`, { waitUntil: 'networkidle' })

      // Fill in invite without last character, then enter last character to simulate typing
      const contentWithoutLastChar = invite!.slice(0, -1)
      const lastChar = invite!.slice(-1)

      // Submit invite
      await page.click('text=Add from Invitation', { delay: 50 })
      await expect(page.locator('textarea[name="invite"]')).toBeVisible()
      await page.fill('textarea[name="invite"]', contentWithoutLastChar)
      await page.locator('textarea[name="invite"]').press(lastChar, { delay: 50 })

      const feedback = page.locator('#new-connection-feedback')
      await expect(feedback).toContainText(aliceE2E.companyName)

      await page.click('button[type="submit"][name="action"][value="createConnection"]', { delay: 50 })

      // Submit pin
      await page.waitForLoadState('networkidle')
      await page.locator('#new-connection-invite-input-pin').pressSequentially(pinForCharlie, { delay: 50 })
      const charlieButton = page.locator('button[type="submit"][name="action"][value="submitPinCode"]')
      await expect(charlieButton).toBeVisible()
      await charlieButton.click({ delay: 50 })

      const confirmationElement = page.locator('#new-connection-invite-input')
      await expect(confirmationElement).toContainText(
        `PIN Code has been submitted for ${aliceE2E.companyName} company ID.`
      )
    })

    await test.step('Retrieve pin for Alice', async () => {
      const newAdminEmail = await checkEmails('admin@veritable.com')
      const extractedPin = await extractPin(newAdminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN from admin email was not found.')
      await clearSmtp4devMessages()
      pinForAlice = extractedPin
    })

    await test.step('Alice submits her PIN', async () => {
      await page.goto(`${aliceE2E.url}/connection`, { waitUntil: 'networkidle' })

      const hrefRegex = /\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      const hrefElement = page.locator(`a[href*="/connection/"][href*="/pin-submission"]`)

      const href = await hrefElement.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`, { delay: 50 })
      await page.waitForLoadState('networkidle')

      await page.locator('#new-connection-invite-input-pin').pressSequentially(pinForAlice, { delay: 50 })
      const aliceButton = page.locator('button[type="submit"][name="action"][value="submitPinCode"]')
      await expect(aliceButton).toBeVisible()
      await aliceButton.click({ delay: 50 })
    })

    await test.step('Check connection is in state verified', async () => {
      const connections = page.getByRole('link', { name: 'connections', exact: true })
      await expect(connections).toBeVisible()
      await connections.click({ delay: 500 })

      await expect(page.locator('div.list-item-status[data-status="success"]')).toHaveText('Connected', {
        timeout: 15000,
      })
      await expect(page.locator('#search-results')).toContainText(charlieE2E.companyNumber)
    })
  })
})
