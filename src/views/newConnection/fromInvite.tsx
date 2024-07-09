import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { BASE_64_URL } from '../../models/strings.js'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'

export type FromInviteFormStage = 'invite' | 'success'
export type FormInviteProps = {
  formStage: FromInviteFormStage
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
          <this.fromInviteForm feedback={feedback} formStage="invite" />
        </div>
      </Page>
    )
  }

  public fromInviteForm = (props: FormInviteProps): JSX.Element => {
    switch (props.formStage) {
      case 'invite':
        return <this.fromInviteInvite {...props}></this.fromInviteInvite>
      case 'success':
        return <this.fromInviteSuccess {...props}></this.fromInviteSuccess>
    }
  }

  private fromInviteInvite = (props: FormInviteProps): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={1}
        progressStepCount={2}
        actions={[
          { type: 'link', text: 'Cancel', href: '/connection' },
          { type: 'submit', value: 'verifyInvite', text: 'Submit' },
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

  private fromInviteSuccess = (props: FormInviteProps): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={2}
        progressStepCount={2}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="from-invite-invite-input">
          <p>
            Your connection has been established, but still needs to be verified. You should receive a verification
            letter at your registered business with instructions on how to do this. A reciprocal verification request
            has been sent in the post on your behalf to the address on the right to verify their identity
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
