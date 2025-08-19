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
      await page.goto(`${baseUrlAlice}`, { waitUntil: 'load' })
      await page.click('a[href="/connection"]')

      await page.waitForSelector('text=Invite New Connection')
      await page.click('a.button[href="connection/new"]')
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
      await page.click('button[type="submit"][name="action"][value="continue"]')

      const confirmationElement = page.locator('#new-connection-confirmation-text')
      await expect(confirmationElement).toBeVisible()
      expect(confirmationElement).toContainText('Please confirm the details of the connection before sending')
      expect(confirmationElement).toContainText('Company Number: 04659351')
      expect(confirmationElement).toContainText('Email Address: alice@testmail.com')

      await page.click('button[type="submit"][name="action"][value="submit"]')
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
      await page.goto(`${baseUrlBob}/connection`, { waitUntil: 'load' })
      await page.waitForURL('**/connection')

      // Fill in invite without last character, then enter last character to simulate typing
      const contentWithoutLastChar = invite!.slice(0, -1)
      const lastChar = invite!.slice(-1)

      // Submit invite
      await page.click('text=Add from Invitation')
      await page.locator('textarea[name="invite"]').waitFor({ state: 'visible' })
      await page.fill('textarea[name="invite"]', contentWithoutLastChar)
      await page.locator('textarea[name="invite"]').press(lastChar)

      // await page.waitForSelector('.feedback-positive')
      const feedback = page.locator('#new-connection-feedback')
      await expect(feedback).toContainText('DIGITAL CATAPULT')

      await page.click('button[type="submit"][name="action"][value="createConnection"]')

      // Submit pin
      const pinInput = page.locator('#new-connection-invite-input-pin')
      await expect(pinInput).toBeVisible()
      await page.fill('#new-connection-invite-input-pin', pinForBob)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')

      const confirmationElement = page.locator('#new-connection-invite-input')
      await expect(confirmationElement).toBeVisible()
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
      await page.goto(`${baseUrlAlice}/connection`, { waitUntil: 'load' })

      const hrefRegex = /\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      const hrefElement = page.locator(`a[href*="/connection/"][href*="/pin-submission"]`)

      const href = await hrefElement.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`)
      await page.locator('#new-connection-invite-input-pin').waitFor({ state: 'visible' })
      await page.fill('#new-connection-invite-input-pin', pinForAlice)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')
    })

    await test.step('Check connection is in state verified', async () => {
      test.slow() // Increase timeout to wait for success message
      await page.click('a[href="/connection"]')
      await page.locator('div.list-item-status[data-status="success"]').waitFor({ state: 'visible' })

      const statusText = page.locator('div.list-item-status[data-status="success"]')
      await expect(statusText).toContainText('Connected')
      await expect(page.locator('#search-results')).toContainText('04659351')
      await expect(page.locator('#search-results')).toContainText('GB')
    })
  })
})
