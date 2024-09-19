import { expect, test } from '@playwright/test'
import { checkEmails, extractInvite, extractPin, findNewAdminEmail } from './helpers/smtpEmails'
import { sleep } from './helpers/utils'

// Describe block for the whole test suite
test.describe('Connection from Alice to Bob', () => {
  let context: any
  let page: any
  let adminEmailId: string
  let invite: string | null
  let pinForBob: string | null
  let pinForAlice: string | null

  // Setup hook to create and share context
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
  })

  test.beforeEach(async () => {
    page = await context.newPage()
  })

  test.afterEach(async () => {
    await page.close()
  })

  // Main test using steps
  test('End-to-end process: Alice registers, invites Bob, Bob and Alice submit PINs', async () => {
    test.setTimeout(100000)

    await test.step('Alice registers on the platform', async () => {
      await page.goto('http://localhost:3000')
      const url = page.url()
      expect(url).toContain(
        'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
      )

      await page.waitForSelector('a[href*="/realms/veritable/login-actions/registration"]')
      await page.click('a[href*="/realms/veritable/login-actions/registration"]')
      await page.waitForURL('**/realms/veritable/login-actions/registration**')
      expect(page.url()).toContain('/realms/veritable/login-actions/registration')

      await page.fill('#username', 'name')
      await page.fill('#password', 'password')
      await page.fill('#password-confirm', 'password')
      await page.fill('#email', 'email@testmail.com')
      await page.fill('#firstName', 'name')
      await page.fill('#lastName', 'lastname')
      await page.click('input[type="submit"][value="Register"]')
      await page.waitForURL('http://localhost:3000')
    })

    await test.step('Alice invites Bob to connect', async () => {
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

      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')

      await page.waitForSelector('text=Invite New Connection')
      await page.click('text=Invite New Connection')
      await page.waitForURL('**/connection/new')
      expect(page.url()).toContain('/connection/new')

      await page.fill('#new-invite-company-number-input', '07964699')
      await page.fill('#new-invite-email-input', 'alice@testmail.com')

      await page.waitForTimeout(10000)

      const feedbackElement = await page.$('#new-connection-feedback')
      expect(feedbackElement).not.toBeNull()
      const feedbackText = await feedbackElement?.textContent()
      expect(feedbackText).toContain('DIGITAL CATAPULT')
      expect(feedbackText).toContain('101 Euston Road')
      await page.click('button[type="submit"][name="action"][value="continue"]')
      await page.waitForTimeout(3000)

      await page.waitForSelector('#new-connection-confirmation-text')
      const confirmationElement = await page.$('#new-connection-confirmation-text')
      expect(confirmationElement).not.toBeNull()
      const confirmationText = await confirmationElement?.textContent()
      expect(confirmationText).toContain('Please confirm the details of the connection before sending')
      expect(confirmationText).toContain('Company House Number: 07964699')
      expect(confirmationText).toContain('Email Address: alice@testmail.com')

      await page.click('button[type="submit"][name="action"][value="submit"]')
      await page.waitForTimeout(3000)

      const confirmationText2 = await (await page.$('#new-connection-confirmation-text'))?.textContent()
      expect(confirmationText2).toContain(
        'Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days to arrive, please wait for their verification and keep updated by viewing the verification status.'
      )

      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      //   await page.waitForTimeout(3000)
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
    })

    await test.step('Bob submits the invite and PIN', async () => {
      const { inviteEmail, adminEmail } = await checkEmails()
      adminEmailId = adminEmail.id
      await sleep(10000)

      pinForBob = await extractPin(adminEmail.id)
      await sleep(4000)
      expect(pinForBob).toHaveLength(6)
      if (!pinForBob) throw new Error('PIN from admin email was not found.')

      invite = await extractInvite(inviteEmail.id)
      await sleep(4000)
      if (!invite) throw new Error('Invitation from admin email was not found.')

      await page.goto('http://localhost:3001')
      const bobUrl = page.url()
      if (
        bobUrl.includes(
          'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
        )
      ) {
        await page.fill('#username', 'name')
        await page.fill('#password', 'password')
        await page.click('input[type="submit"][value="Sign In"]')
        await page.waitForURL('http://localhost:3001')
      }

      await page.goto('http://localhost:3001/connection')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')

      await page.waitForSelector('text=Add from Invitation')
      await page.click('text=Add from Invitation')
      await page.waitForURL('**/connection/new?fromInvite=true')
      expect(page.url()).toContain('/connection/new?fromInvite=true')

      const contentWithoutLastChar = invite.slice(0, -1)
      const lastChar = invite.slice(-1)
      await page.fill('textarea[name="invite"]', contentWithoutLastChar)
      await page.locator('textarea[name="invite"]').press(lastChar)

      await page.waitForTimeout(3000)
      const positiveFeedback = await page.$('.feedback-positive')
      expect(positiveFeedback).not.toBeNull()

      const feedback = await page.$('#new-connection-feedback')
      expect(feedback).not.toBeNull()
      const feedbackText = await feedback?.textContent()
      expect(feedbackText).toContain('Registered Office Address')
      expect(feedbackText).toContain('DIGITAL CATAPULT')

      await page.click('button[type="submit"][name="action"][value="createConnection"]')
      await page.waitForTimeout(3000)

      const pinUrl = page.url()
      const urlPattern = /http:\/\/localhost:3001\/connection\/[a-f0-9\-]+\/pin-submission/
      expect(pinUrl).toMatch(urlPattern)

      await page.fill('#new-connection-invite-input-pin', pinForBob)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')
      await page.waitForTimeout(3000)

      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
    })

    await test.step('Alice submits her PIN', async () => {
      const newAdminEmail = await findNewAdminEmail(adminEmailId)
      pinForAlice = await extractPin(newAdminEmail.id)
      expect(pinForAlice).toHaveLength(6)
      if (!pinForAlice) throw new Error('PIN from admin email was not found.')

      await page.goto('http://localhost:3000')
      const aliceUrl = page.url()
      if (
        aliceUrl.includes(
          'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
        )
      ) {
        await page.fill('#username', 'name')
        await page.fill('#password', 'password')
        await page.click('input[type="submit"][value="Sign In"]')
        await page.waitForURL('http://localhost:3000')
      }

      await page.goto('http://localhost:3000/connection')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')

      const hrefRegex = /\/connection\/[0-9a-fA-F\-]{36}\/pin-submission/
      await page.waitForSelector(`a[href*="/connection/"][href*="/pin-submission"]`)
      const hrefElement = await page.$(`a[href*="/connection/"][href*="/pin-submission"]`)
      expect(hrefElement).not.toBeNull()

      const href = await hrefElement?.getAttribute('href')
      expect(href).toMatch(hrefRegex)

      await page.click(`a[href="${href}"]`)
      await page.waitForURL('**/pin-submission')

      await page.fill('#new-connection-invite-input-pin', pinForAlice)
      await page.click('button[type="submit"][name="action"][value="submitPinCode"]')
      await page.waitForTimeout(3000)
    })
    await test.step('Check connection is in state verified', async () => {
      await page.waitForSelector('a[href="/connection"]')
      await page.click('a[href="/connection"]')
      await page.waitForURL('**/connection')
      expect(page.url()).toContain('/connection')
      await page.waitForSelector('div.list-item-status[data-status="success"]')
      const statusText = await page.textContent('div.list-item-status[data-status="success"]')
      expect(statusText).toContain('Verified - Established Connection')
    })
  })
})
