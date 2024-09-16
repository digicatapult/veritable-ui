import { expect, test } from '@playwright/test'

test('Connection from Alice to Bob ', async ({ browser }) => {
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
  // Wait for the textarea to be rendered
  await page.waitForSelector('#new-connection-invite-input textarea[name="invite"]')

  // Assert that the textarea is present and contains the placeholder text
  const textarea = await page.$('#new-connection-invite-input textarea[name="invite"]')
  // Ensure the textarea is not null before proceeding
  if (!textarea) {
    throw new Error('Textarea was not found on the page')
  }

  // Need to mock the successful look up to the company house

  // Wait for the textarea content to update
  //   await page.waitForFunction((el) => (el as HTMLTextAreaElement).value.includes('Registered Office Address'), textarea)
  //   // Retrieve the current value of the textarea
  //   const textareaContent = await textarea.evaluate((el) => (el as HTMLTextAreaElement).value)

  // Define the expected content
  //   const expectedContent = `Registered Office Address
  //   DIGITAL CATAPULT, Level 9, 101 Euston Road, London, NW1 2RA

  //   Company Status
  //   active`

  // Assert that the textarea content matches the expected text
  //   expect(textareaContent).toBe(expectedContent)

  // Now click on the "Continue" button
  await page.click('button[type="submit"][name="action"][value="continue"]')

  // Wait for any subsequent page or action to occur, if needed
  await page.waitForNavigation() // Adjust the navigation wait as per your application's behavior
})
