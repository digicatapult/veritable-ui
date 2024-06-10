import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'

export type FromInviteFormStage = 'invite' | 'success'

@singleton()
export class FromInviteTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public fromInviteFormPage = (feedback: FormFeedback) => {
    return (
      <Page
        title="Veritable - New Connection"
        heading="New Connection"
        url="/connection/new"
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

  public fromInviteForm = (props: { formStage: FromInviteFormStage; feedback: FormFeedback }): JSX.Element => {
    switch (props.formStage) {
      case 'invite':
        return <this.fromInviteInvite {...props}></this.fromInviteInvite>
      case 'success':
        return <this.fromInviteSuccess {...props}></this.fromInviteSuccess>
    }
  }

  private fromInviteInvite = (props: { invite?: string; feedback: FormFeedback }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={1}
        progressStepCount={2}
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
            hx-trigger="keyup changed delay:200ms, change, load"
            hx-target="#new-connection-feedback"
            hx-select="#new-connection-feedback"
            hx-swap="outerHTML"
          >
            {props.invite ? Html.escapeHtml(props.invite) : ''}
          </textarea>
        </div>
      </this.newConnectionForm>
    )
  }

  private fromInviteSuccess = (props: { feedback: FormFeedback }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={2}
        progressStepCount={2}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="new-invite-confirmation-text">
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
