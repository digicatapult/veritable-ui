import Html from '@kitajs/html'
import { SendMailOptions } from 'nodemailer'

import { Env } from '../../../env/index.js'
import CompanyHouseEntity from '../../companyHouseEntity.js'

export default {
  name: 'connection_invite_admin' as const,
  template: async function (
    env: Env,
    params: { pin: string; invitator: string; address: string }
  ): Promise<SendMailOptions> {
    const companyHouse = new CompanyHouseEntity(env)
    const localCompany = await companyHouse.localCompanyHouseProfile()
    return {
      to: env.get('EMAIL_ADMIN_ADDRESS'),
      from: env.get('EMAIL_FROM_ADDRESS'),
      subject: `Postal Code for Verification: Invitation from ${params.invitator} on Veritable`,
      text: `
        Hi ${localCompany.company_name},
        ${params.invitator} as sent you a request to connect securely on Veritable. To complete the verification process, please enter the following 6-digit postal code within your Veritable instance.

        Verification Code: ${params.pin},
        Address: ${params.address}
      `,
      html: await (
        <>
          <h1>{Html.escapeHtml(`Hi ${localCompany.company_name}`)}</h1>
          <br />
          <p>
            {Html.escapeHtml(
              `${params.invitator} as sent you a request to connect securely on Veritable. To complete the verification process, please enter the following 6-digit postal code within your Veritable instance.`
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
