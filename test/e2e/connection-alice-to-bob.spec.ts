import { expect, test } from '@playwright/test'
import { withCleanApp, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { checkEmails, extractInvite, extractPin, findNewAdminEmail } from './helpers/smtpEmails.js'

test.describe('Connection from Alice to Bob', () => {
  let context: any
  let page: any
  let adminEmailId: string
  let invite: string | null
  let pinForBob: string | null
  let pinForAlice: string | null

  // Create and share context
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
    await withRegisteredAccount(page, context)
  })

  test.beforeEach(async () => {
    await withCleanApp()
    page = await context.newPage()
    await withLoggedInUser(page, context)
  })

  test.afterEach(async () => {
    await withCleanApp()
    await page.close()
  })
  // End-to-end process: Alice registers, invites Bob, Bob submits invite & pin, Alice submits pin
  test('Connection from Alice to Bob', async () => {
    test.setTimeout(100000)

    await test.step('Alice invites Bob to connect', async () => {
      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')

      await page.waitForSelector('text=Invite New Connection')
      await page.click('a.button[href="connection/new"]')
      await page.waitForURL('**/connection/new')

      await page.fill('#new-invite-company-number-input', '07964699')
      await page.fill('#new-invite-email-input', 'alice@testmail.com')

      await page.waitForTimeout(3000) // Wait for the Company House API

      const feedbackElement = await page.$('#new-connection-feedback')
      expect(feedbackElement).not.toBeNull()
      const feedbackText = await feedbackElement?.textContent()
      expect(feedbackText).toContain('DIGITAL CATAPULT')
      expect(feedbackText).toContain('101 Euston Road')
      await page.click('button[type="submit"][name="action"][value="continue"]')

      await page.waitForSelector('#new-connection-confirmation-text')
      const confirmationElement = await page.$('#new-connection-confirmation-text')
      expect(confirmationElement).not.toBeNull()
      const confirmationText = await confirmationElement?.textContent()
      expect(confirmationText).toContain('Please confirm the details of the connection before sending')
      expect(confirmationText).toContain('Company House Number: 07964699')
      expect(confirmationText).toContain('Email Address: alice@testmail.com')

      await page.click('button[type="submit"][name="action"][value="submit"]')
      await page.waitForSelector(
        'text="Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days to arrive, please wait for their verification and keep updated by viewing the verification status."'
      )

      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
    })

    await test.step('Retrieve invite and pin for Bob', async () => {
      const { inviteEmail, adminEmail } = await checkEmails()
      adminEmailId = adminEmail.id

      pinForBob = await extractPin(adminEmail.id)
      expect(pinForBob).toHaveLength(6)
      if (!pinForBob) throw new Error('PIN for Bob was not found.')
      invite = await extractInvite(inviteEmail.id)
      if (!invite) throw new Error('Invitation for Bob was not found.')
    })

    await test.step('Bob submits invite and pin', async () => {
      await page.goto('http://localhost:3001/connection')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
      // Submit invite
      await page.waitForSelector('text=Add from Invitation')
      await page.click('text=Add from Invitation')
      await page.waitForURL('**/connection/new?fromInvite=true')

      // Fill in invite without last character, then enter last character to simulate typing
      if (!invite) throw new Error('Invitation for Bob was not found.')
      const contentWithoutLastChar = invite.slice(0, -1)
      const lastChar = invite.slice(-1)
      await page.fill('textarea[name="invite"]', contentWithoutLastChar)
      await page.locator('textarea[name="invite"]').press(lastChar)

      await page.waitForSelector('.feedback-positive')
      const positiveFeedback = await page.$('.feedback-positive')
      expect(positiveFeedback).not.toBeNull()
      const feedback = await page.$('#new-connection-feedback')
      expect(feedback).not.toBeNull()

      const feedbackText = await feedback?.textContent()
      expect(feedbackText).toContain('Registered Office Address')
      expect(feedbackText).toContain('DIGITAL CATAPULT')

      await page.click('button[type="submit"][name="action"][value="createConnection"]')
      await page.waitForTimeout(3000)

      // Submit pin
      await page.waitForURL('**/pin-submission')
      const pinUrl = page.url()
      const urlPattern = /http:\/\/localhost:3001\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      expect(pinUrl).toMatch(urlPattern)

      await page.fill('#new-connection-invite-input-pin', pinForBob)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')

      await page.waitForURL('**/connection')
    })

    await test.step('Retrieve pin for Alice', async () => {
      const newAdminEmail = await findNewAdminEmail(adminEmailId)
      pinForAlice = await extractPin(newAdminEmail.id)
      expect(pinForAlice).toHaveLength(6)
      if (!pinForAlice) throw new Error('PIN from admin email was not found.')
    })

    await test.step('Alice submits her PIN', async () => {
      await page.goto('http://localhost:3000/connection')
      await page.waitForURL('**/connection')

      const hrefRegex = /\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      await page.waitForSelector(`a[href*="/connection/"][href*="/pin-submission"]`)
      const hrefElement = await page.$(`a[href*="/connection/"][href*="/pin-submission"]`)
      expect(hrefElement).not.toBeNull()

      const href = await hrefElement?.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`)
      await page.waitForURL('**/pin-submission')

      await page.fill('#new-connection-invite-input-pin', pinForAlice)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')
    })
    await test.step('Check connection is in state verified', async () => {
      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      await page.waitForSelector('div.list-item-status[data-status="success"]')
      const statusText = await page.textContent('div.list-item-status[data-status="success"]')
      expect(statusText).toContain('Verified - Established Connection')
    })
  })
})
