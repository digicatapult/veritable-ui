import { expect, Page, test } from '@playwright/test'
import { cleanup, CustomBrowserContext, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn.js'
import { checkEmails, extractInvite, extractPin, findNewAdminEmail } from './helpers/smtpEmails.js'

test.describe('Connection from Alice to Bob', () => {
  let context: CustomBrowserContext
  let page: Page
  let adminEmailId: string
  let invite: string | null
  let pinForBob: string
  let pinForAlice: string

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'
  const baseUrlBob = process.env.VERITABLE_BOB_PUBLIC_URL || 'http://localhost:3001'

  // Create and share context
  test.beforeAll(async () => {
    await cleanup([baseUrlAlice, baseUrlBob])
  })

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    await withRegisteredAccount(page, context, baseUrlAlice)
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await page.close()
    await cleanup([baseUrlAlice, baseUrlBob])
  })
  // End-to-end process: Alice registers, invites Bob, Bob submits invite & pin, Alice submits pin
  test('Connection from Alice to Bob', async () => {
    test.setTimeout(1000000)

    await test.step('Alice invites Bob to connect', async () => {
      await page.goto(`${baseUrlAlice}`)
      await page.click('a[href="/connection"]')

      await page.waitForSelector('text=Invite New Connection')
      await page.click('a.button[href="connection/new"]')

      await page.fill('#new-invite-company-number-input', '04659351')
      await page.fill('#new-invite-email-input', 'alice@testmail.com')

      await page.waitForTimeout(3000) // Wait for the Company House API

      const feedbackElement = await page.$('#new-connection-feedback')
      expect(feedbackElement).not.toBeNull()
      const feedbackText = await feedbackElement?.textContent()
      expect(feedbackText).toContain('OFFSHORE RENEWABLE ENERGY CATAPULT')
      expect(feedbackText).toContain('Albert Street')
      await page.click('button[type="submit"][name="action"][value="continue"]')

      await page.waitForSelector('#new-connection-confirmation-text')
      const confirmationElement = await page.$('#new-connection-confirmation-text')
      expect(confirmationElement).not.toBeNull()
      const confirmationText = await confirmationElement?.textContent()
      expect(confirmationText).toContain('Please confirm the details of the connection before sending')
      expect(confirmationText).toContain('Company House Number: 04659351')
      expect(confirmationText).toContain('Email Address: alice@testmail.com')

      await page.click('button[type="submit"][name="action"][value="submit"]')
      await page.waitForSelector(
        'text="Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days to arrive, please wait for their verification and keep updated by viewing the verification status."'
      )

      await page.click('a[href="/connection"]')
      expect(page.url()).toContain('/connection')
    })

    await test.step('Retrieve invite and pin for Bob', async () => {
      const adminEmail = await checkEmails('admin@veritable.com')
      const inviteEmail = await checkEmails('alice@testmail.com')
      adminEmailId = adminEmail.id

      const extractedPin = await extractPin(adminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN for Bob was not found.')
      pinForBob = extractedPin
      invite = await extractInvite(inviteEmail.id)
      if (!invite) throw new Error('Invitation for Bob was not found.')
    })

    await test.step('Bob submits invite and pin', async () => {
      await page.goto(`${baseUrlBob}/connection`)
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
      // Submit invite
      await page.click('text=Add from Invitation')

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

      // Submit pin

      await page.fill('#new-connection-invite-input-pin', pinForBob)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')

      await page.waitForSelector('#new-connection-invite-input')
      const confirmationElement = await page.$('#new-connection-invite-input')
      expect(confirmationElement).not.toBeNull()
      const confirmationText = await confirmationElement?.textContent()
      expect(confirmationText).toContain('PIN Code has been submitted for DIGITAL CATAPULT company ID.')
      await page.click('a[href="/connection"]', { delay: 1000 })
    })

    await test.step('Retrieve pin for Alice', async () => {
      const newAdminEmail = await findNewAdminEmail(adminEmailId)
      const extractedPin = await extractPin(newAdminEmail.id)
      expect(extractedPin).toHaveLength(6)
      if (!extractedPin) throw new Error('PIN from admin email was not found.')

      pinForAlice = extractedPin
    })

    await test.step('Alice submits her PIN', async () => {
      await page.goto(`${baseUrlAlice}/connection`)

      const hrefRegex = /\/connection\/[0-9a-fA-F-]{36}\/pin-submission/
      const hrefElement = await page.$(`a[href*="/connection/"][href*="/pin-submission"]`)
      expect(hrefElement).not.toBeNull()

      const href = await hrefElement?.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`)
      await page.fill('#new-connection-invite-input-pin', pinForAlice)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')
    })
    await test.step('Check connection is in state verified', async () => {
      await page.click('a[href="/connection"]', { delay: 5000 })
      const statusText = await page.textContent('div.list-item-status[data-status="success"]')
      expect(statusText).toContain('Connected')
    })
  })
})
