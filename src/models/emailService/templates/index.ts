import type { SendMailOptions } from 'nodemailer'

import { singleton } from 'tsyringe'

import { Env } from '../../../env.js'
import invitation from './invitation.js'
import invitationAdmin from './invitationAdmin.js'

export type templateName = keyof templateParams
export type templateHandlers = {
  [key in templateName]: (env: Env, ...params: templateParams[key]) => Promise<SendMailOptions>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractParam<F extends { template: (env: Env, ...args: any[]) => unknown }> = F['template'] extends (
  env: Env,
  ...params: infer P
) => unknown
  ? P
  : never

export type templateParams = {
  [invitation.name]: ExtractParam<typeof invitation>
  [invitationAdmin.name]: ExtractParam<typeof invitationAdmin>
}
@singleton()
class Templates implements templateHandlers {
  [invitation.name] = invitation.template;
  [invitationAdmin.name] = invitationAdmin.template
}

export default Templates
