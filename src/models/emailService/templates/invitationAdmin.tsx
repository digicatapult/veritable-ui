import Html from '@kitajs/html'
import { SendMailOptions } from 'nodemailer'
import { Env } from '../../../env.js'

export default {
  name: 'connection_invite_admin' as const,
  template: async function (env: Env, params: { pin: string; address: string }): Promise<SendMailOptions> {
    return {
      to: env.get('EMAIL_ADMIN_ADDRESS'),
      from: env.get('EMAIL_FROM_ADDRESS'),
      subject: 'Action required: process veritable invitation',
      text: `
        Action required: process veritable invitation    
        PIN: ${params.pin},
        Address: ${params.address},
      `,
      html: await (
        <>
          <h1>Action required: process veritable invitation</h1>
          <p>Pin:</p>
          <p>{Html.escapeHtml(params.pin)}</p>
          <p>Address:</p>
          <p>{Html.escapeHtml(params.address)}</p>
        </>
      ),
    }
  },
}
