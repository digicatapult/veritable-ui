import Html from '@kitajs/html'
import { SendMailOptions } from 'nodemailer'

import { Env } from '../../../env/index.js'

export default {
  name: 'connection_invite' as const,
  template: async function (env: Env, params: { to: string; invite: string }): Promise<SendMailOptions> {
    return {
      to: params.to,
      from: env.get('EMAIL_FROM_ADDRESS'),
      subject: 'Veritable invite',
      text: params.invite,
      html: await (
        <>
          <h1>This is an invite to connect to Veritable</h1>
          <p>{Html.escapeHtml(params.invite)}</p>
        </>
      ),
    }
  },
}
