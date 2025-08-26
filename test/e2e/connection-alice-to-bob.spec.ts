import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from '../helpers/registerLogIn.js'
import { checkEmails, extractInvite, extractPin } from '../helpers/smtpEmails.js'

test.describe('Connection from Alice to Bob', () => {
  let context: CustomBrowserContext
  let page: Page
  let invite: string | null
  let pinForBob: string
  let pinForAlice: string

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterAll(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
    await page.close()
    await context.close()
  })

  // End-to-end process: Alice registers, invites Bob, Bob submits invite & pin, Alice submits pin
  test('Connection from Alice to Bob', async () => {
    await test.step('Alice invites Bob to connect', async () => {
      await page.goto(`${baseUrlAlice}`, { waitUntil: 'networkidle' })
      await page.click('a[href="/connection"]', { delay: 100 })

      const button = page.getByRole('link', { name: 'Invite New Connection' })
      await expect(button).toBeVisible()
      await button.click({ delay: 100 })
      await page.locator('#new-invite-country-select').waitFor({ state: 'visible' })
      await page.selectOption('#new-invite-country-select', 'United Kingdom')
      await expect(page.locator('#new-invite-country-code-display')).toHaveValue('GB')

      await page.fill('#new-invite-company-number-input', '04659351')
      await page.fill('#new-invite-email-input', 'alice@testmail.com')

      const feedbackElement = page.locator('#new-connection-feedback')
      // waits for the Company House API
      await expect(feedbackElement).toHaveAttribute('class', 'accented-container feedback-positive')
      await expect(feedbackElement).toContainText('OFFSHORE RENEWABLE ENERGY CATAPULT')
      await expect(feedbackElement).toContainText('Albert Street')
      await page.click('button[type="submit"][name="action"][value="continue"]', { delay: 100 })

      const confirmationElement = page.locator('#new-connection-confirmation-text')
      await expect(confirmationElement).toBeVisible({ timeout: 12000 })
      await expect(confirmationElement).toContainText('Please confirm the details of the connection before sending')
      await expect(confirmationElement).toContainText('Company Number: 04659351')
      await expect(confirmationElement).toContainText('Email Address: alice@testmail.com')

      await page.click('button[type="submit"][name="action"][value="submit"]', { delay: 100 })
      await expect(confirmationElement).toContainText('Your connection invitation has been sent')
    })

    await test.step('Retrieve invite and pin for Bob', async () => {
      const adminEmail = await checkEmails('admin@veritable.com')
      const inviteEmail = await checkEmails('alice@testmail.com')

      const extractedPin = await extractPin(adminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN for Bob was not found.')
      pinForBob = extractedPin
      invite = await extractInvite(inviteEmail.id)
      if (!invite) throw new Error('Invitation for Bob was not found.')
    })

    await test.step('Bob submits invite and pin', async () => {
      if (!invite) throw new Error('Invitation for Charlie was not found.')
      await page.goto(`${baseUrlBob}/connection`, { waitUntil: 'networkidle' })

      // Fill in invite without last character, then enter last character to simulate typing
      const contentWithoutLastChar = invite!.slice(0, -1)
      const lastChar = invite!.slice(-1)

      // Submit invite
      await page.click('text=Add from Invitation', { delay: 100 })
      await page.locator('textarea[name="invite"]').waitFor({ state: 'visible' })
      await page.fill('textarea[name="invite"]', contentWithoutLastChar)
      await page.locator('textarea[name="invite"]').press(lastChar)

      const feedback = page.locator('#new-connection-feedback')
      await expect(feedback).toContainText('DIGITAL CATAPULT', { timeout: 12000 })

      await page.click('button[type="submit"][name="action"][value="createConnection"]', { delay: 100 })

      // Submit pin
      await page.waitForLoadState('networkidle')
      await page.locator('#new-connection-invite-input-pin').waitFor({ state: 'visible' })
      await page.fill('#new-connection-invite-input-pin', pinForBob)
      const bobButton = page.locator('button[type="submit"][name="action"][value="submitPinCode"]')
      await bobButton.click({ delay: 100 })

      const confirmationElement = page.locator('#new-connection-invite-input')
      await expect(confirmationElement).toBeVisible({ timeout: 12000 })
      await expect(confirmationElement).toContainText('PIN Code has been submitted for DIGITAL CATAPULT company ID.')
    })

    await test.step('Retrieve pin for Alice', async () => {
      const newAdminEmail = await checkEmails('admin@veritable.com')
      const extractedPin = await extractPin(newAdminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN from admin email was not found.')

      pinForAlice = extractedPin
    })

    await test.step('Alice submits her PIN', async () => {
      await page.goto(`${baseUrlAlice}/connection`, { waitUntil: 'networkidle' })

      const hrefRegex = /\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      const hrefElement = page.locator(`a[href*="/connection/"][href*="/pin-submission"]`)

      const href = await hrefElement.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`, { delay: 100 })
      await page.waitForLoadState('networkidle')
      await page.locator('#new-connection-invite-input-pin').waitFor({ state: 'visible' })
      await page.fill('#new-connection-invite-input-pin', pinForAlice)
      const aliceButton = page.locator('button[type="submit"][name="action"][value="submitPinCode"]')
      await expect(aliceButton).toBeVisible()
      await aliceButton.click({ delay: 100 })
      await page.waitForLoadState('networkidle')
    })

    await test.step('Check connection is in state verified', async () => {
      const connections = page.getByRole('link', { name: 'connections', exact: true })
      await expect(connections).toBeVisible()
      await connections.click({ delay: 100 })

      const statusText = page.locator('div.list-item-status[data-status="success"]')
      await expect(statusText).toBeVisible({ timeout: 15000 })
      await expect(statusText).toContainText('Connected')
      await expect(page.locator('#search-results')).toContainText('04659351')
      await expect(page.locator('#search-results')).toContainText('GB')
    })
  })
})
