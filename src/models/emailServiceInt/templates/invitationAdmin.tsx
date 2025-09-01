import Html from '@kitajs/html'
import { SendMailOptions } from 'nodemailer'

import { Env } from '../../../env/index.js'
import { ILogger } from '../../../logger.js'
import OrganisationRegistry from '../../orgRegistry/organisationRegistry.js'

export default {
  name: 'connection_invite_admin' as const,
  template: async function (
    env: Env,
    logger: ILogger,
    params: { pin: string; receiver: string; address: string }
  ): Promise<SendMailOptions> {
    const organisationRegistry = new OrganisationRegistry(env, logger)
    const localCompany = await organisationRegistry.localOrganisationProfile()
    return {
      to: env.get('EMAIL_ADMIN_ADDRESS'),
      from: env.get('EMAIL_FROM_ADDRESS'),
      subject: `Postal Code for Verification: Invitation from ${localCompany.name} on Veritable`,
      text: `
        Hi ${localCompany.name} Admin,
        Please post this verification code to ${params.receiver}, to complete the verification process.

        Address: ${params.address}

        Verification Code: ${params.pin},
      `,
      html: await (
        <>
          <h1>{Html.escapeHtml(`Hi ${localCompany.name}`)}</h1>
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
