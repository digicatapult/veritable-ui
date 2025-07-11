import Html from '@kitajs/html'
import { SendMailOptions } from 'nodemailer'

import { Env } from '../../../env/index.js'
import OrganisationRegistry from '../../organisationRegistry.js'

export default {
  name: 'connection_invite_admin' as const,
  template: async function (
    env: Env,
    params: { pin: string; receiver: string; address: string }
  ): Promise<SendMailOptions> {
    const organisationRegistry = new OrganisationRegistry(env)
    const localCompany = await organisationRegistry.localOrganisationProfile()
    return {
      to: env.get('EMAIL_ADMIN_ADDRESS'),
      from: env.get('EMAIL_FROM_ADDRESS'),
      subject: `Postal Code for Verification: Invitation from ${localCompany.company_name} on Veritable`,
      text: `
        Hi ${localCompany.company_name} Admin,
        Please post this verification code to ${params.receiver}, to complete the verification process.

        Address: ${params.address}

        Verification Code: ${params.pin},
      `,
      html: await (
        <>
          <h1>{Html.escapeHtml(`Hi ${localCompany.company_name}`)}</h1>
          <br />
          <p>
            {Html.escapeHtml(
              `Please post this verification code to ${params.receiver}, to complete the verification process.`
            )}
          </p>

          <br />
          <p>Verification Code:</p>
          <p>{Html.escapeHtml(params.pin)}</p>
          <p>Address:</p>
          <p>{Html.escapeHtml(params.address)}</p>
        </>
      ),
    }
  },
}
