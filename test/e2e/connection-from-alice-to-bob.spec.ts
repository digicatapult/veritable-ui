import { expect, test } from '@playwright/test'
import { checkEmails, extractInvite, extractPin } from './helpers/smtpEmails'
import { sleep } from './helpers/utils'

test.describe('Connection from Alice to Bob', () => {
  test('Login as Alice', async ({ browser }) => {
    test.setTimeout(100000)
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('http://localhost:3000')

    const url = page.url()

    expect(url).toContain(
      'http://localhost:3080/realms/veritable/protocol/openid-connect/auth?response_type=code&client_id=veritable-ui&redirect_uri=http'
    )
    // Wait for the "Register" link to be visible on the Keycloak login page and click
    await page.waitForSelector('a[href*="/realms/veritable/login-actions/registration"]')
    await page.click('a[href*="/realms/veritable/login-actions/registration"]')

    // Wait for the registration page to load
    await page.waitForURL('**/realms/veritable/login-actions/registration**')
    expect(page.url()).toContain('/realms/veritable/login-actions/registration')

    // Fill in the fields
    await page.fill('#username', 'name')
    await page.fill('#password', 'password')
    await page.fill('#password-confirm', 'password')
    await page.fill('#email', 'email@testmail.com')
    await page.fill('#firstName', 'name')
    await page.fill('#lastName', 'lastname')
    await page.click('input[type="submit"][value="Register"]')
    await page.waitForURL('http://localhost:3000')

    // Wait for the link to be visible (make sure the page is fully loaded) and click
    await page.waitForSelector('a[href="/connection"]')
    await page.click('a[href="/connection"]')

    // Wait for the page to navigate to the expected URL after clicking
    await page.waitForURL('**/connection')
    expect(page.url()).toContain('/connection')

    // Wait for the "Invite New Connection" button to be visible and click
    await page.waitForSelector('text=Invite New Connection')
    await page.click('text=Invite New Connection')

    // Wait for the page to navigate to the expected URL after clicking
    await page.waitForURL('**/connection/new')
    expect(page.url()).toContain('/connection/new')

    // Fill in the fields
    await page.fill('#new-invite-company-number-input', '07964699')
    await page.fill('#new-invite-email-input', 'alice@testmail.com')

    await page.waitForTimeout(10000)

    // Check we have positive feedback a.k.a green box
    await page.evaluate(() => document.querySelector('#new-connection-feedback'), { timeout: 10000 })
    await page.evaluate(() => document.querySelector('.positive-feedback'), { timeout: 10000 })

    // Ensure the feedback element is present and get its text content
    const feedbackElement = await page.$('#new-connection-feedback')
    if (!feedbackElement) {
      throw new Error('Feedback element was not found on the page')
    }

    // Get the text content of the feedback element
    const textContent = await feedbackElement.textContent()
    if (!textContent) {
      throw new Error('Feedback element does not contain any text')
    }

    // Assert that the feedback element contains the expected text & continue
    expect(textContent).toContain('DIGITAL CATAPULT')
    expect(textContent).toContain('101 Euston Road')
    await page.click('button[type="submit"][name="action"][value="continue"]')
    await page.waitForTimeout(3000)

    // Confirmation page checks
    await page.evaluate(() => document.querySelector('#new-connection-confirmation-text'), { timeout: 10000 })
    const confirmationElement = await page.$('#new-connection-confirmation-text')
    if (!confirmationElement) {
      throw new Error('Confirmation element was not found on the page')
    }
    const confirmationElementText = await confirmationElement.textContent()

    if (!confirmationElementText) {
      throw new Error('Confirmation element does not contain any text')
    }

    expect(confirmationElementText).toContain('Please confirm the details of the connection before sending')
    expect(confirmationElementText).toContain('Company House Number: 07964699')
    expect(confirmationElementText).toContain('Email Address: alice@testmail.com')

    // Click "Submit" & check final confirm page
    await page.click('button[type="submit"][name="action"][value="submit"]')
    await page.waitForTimeout(3000)
    await page.evaluate(() => document.querySelector('#new-connection-confirmation-text'), { timeout: 10000 })
    const confirmationElement2 = await page.$('#new-connection-confirmation-text')
    if (!confirmationElement2) {
      throw new Error('Confirmation element was not found on the page')
    }
    const confirmationElementText2 = await confirmationElement2.textContent()
    if (!confirmationElementText2) {
      throw new Error('Confirmation element does not contain any text')
    }
    expect(confirmationElementText2).toContain(
      'Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days to arrive, please wait for their verification and keep updated by viewing the verification status.'
    )

    // Back to connections page ... should this be back home?
    await page.waitForSelector('a[href="/connection"]')
    await page.click('a[href="/connection"]')
    await page.waitForTimeout(3000)
    await page.waitForURL('**/connection')
    expect(page.url()).toContain('/connection')

    // Get emails
    const { inviteEmail, adminEmail } = await checkEmails()
    await sleep(10000)

    // Get emails content
    const adminEmailContent = await extractPin(adminEmail.id)
    await sleep(4000)
    expect(adminEmailContent).toHaveLength(6)
    if (!adminEmailContent) {
      throw new Error('PIN from admin email was not found.')
    }

    const inviteEmailContent = await extractInvite(inviteEmail.id) //what to assert here
    await sleep(4000)
    console.log(inviteEmailContent)
    if (!inviteEmailContent) {
      throw new Error('Invitation from admin email was not found.')
    }

    // Go to Bob
    await page.goto('http://localhost:3001/connection')
    await page.waitForURL('**/connection')
    expect(page.url()).toContain('/connection')
    // Wait for the "Add from Invitation" button to be visible and click
    await page.waitForSelector('text=Add from Invitation')
    await page.click('text=Add from Invitation')
    await page.waitForURL('**/connection/new?fromInvite=true')
    expect(page.url()).toContain('/connection/new?fromInvite=true')

    // Fill in invite
    await page.fill('textarea[name="invite"]', inviteEmailContent)
    await page.waitForTimeout(10000)
    await page.click('textarea[name="invite"]')
    await page.waitForTimeout(1000)

    // Verify feedback
    await page.evaluate(() => document.querySelector('#new-connection-feedback'), { timeout: 10000 })
    await page.evaluate(() => document.querySelector('.positive-feedback'), { timeout: 10000 })

    const feedback = await page.$('#new-connection-feedback')
    if (!feedback) {
      throw new Error('Confirmation element was not found on the page')
    }
    const feedbackText = await feedback.textContent()
    if (!confirmationElementText2) {
      throw new Error('Confirmation element does not contain any text')
    }

    expect(feedbackText).toContain('Registered Office Address')
    expect(feedbackText).toContain('DIGITAL CATAPULT')
    await page.click('button[type="submit"][name="action"][value="continue"]')
  })
})
