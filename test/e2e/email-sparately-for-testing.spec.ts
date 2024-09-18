import { test } from '@playwright/test'
import { checkEmails, extractInvite, extractPin } from './helpers/smtpEmails'

test.describe('Emails', () => {
  test('Check emails exist', async () => {
    const { inviteEmail, adminEmail } = await checkEmails()

    console.log(inviteEmail)
    console.log(adminEmail)
    await sleep(3000)
    //email content
    const adminEmailContent = await extractPin(adminEmail.id)
    console.log(adminEmailContent)
    await sleep(3000)
    const inviteEmailContent = await extractInvite(inviteEmail.id)
    console.log(inviteEmailContent)

    await sleep(2000)
  })
})

//only for testing
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
