import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { BASE_64_URL } from '../../models/strings.js'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'

export type FormInviteProps = {
  feedback: FormFeedback
  invite?: BASE_64_URL
}

@singleton()
export class FromInviteTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public fromInviteFormPage = (feedback: FormFeedback) => {
    return (
      <Page
        title="Veritable - New Connection"
        activePage="connections"
        heading="New Connection"
        headerLinks={[
          { name: 'Connections', url: '/connection' },
          { name: 'Add from Invitation', url: '/connection/new?fromInvite=true' },
        ]}
        stylesheets={['new-invite.css']}
      >
        <div class="connections header">
          <span>Invite New Connection</span>
        </div>
        <div class="card-body ">
          <this.fromInviteForm feedback={feedback} />
        </div>
      </Page>
    )
  }

  public fromInviteForm = (props: FormInviteProps): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="new/receive-invitation"
        feedback={props.feedback}
        progressStep={1}
        progressStepCount={3}
        actions={[
          { type: 'link', text: 'Cancel', href: '/connection' },
          { type: 'submit', value: 'createConnection', text: 'Submit' },
        ]}
      >
        <div id="from-invite-invite-input" class="accented-container">
          <textarea
            name="invite"
            placeholder="Invitation Text"
            required
            hx-get="/connection/new/verify-invite"
            hx-trigger="keyup changed delay:20ms, change, load"
            hx-target="#new-connection-feedback"
            hx-select="#new-connection-feedback"
            hx-swap="outerHTML"
          >
            {Html.escapeHtml(props.invite || '')}
          </textarea>
        </div>
      </this.newConnectionForm>
    )
  }
}
