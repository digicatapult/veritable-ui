import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { BASE_64_URL } from '../../models/strings.js'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'
import { CompanyProfile } from '../../models/companyHouseEntity.js'

export type FromInviteFormStage = 'invite' | 'pin' | 'success'

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

  public fromInviteForm = (props: {
    formStage: FromInviteFormStage
    feedback: FormFeedback
    invite?: BASE_64_URL | string
    pin?: string
  }): JSX.Element => {
    switch (props.formStage) {
      case 'invite':
        return <this.fromInviteInvite {...props}></this.fromInviteInvite>
      case 'pin':
        return <this.newInvitePin {...props}></this.newInvitePin>
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

  public newInvitePin = (props: { feedback: FormFeedback; invite?: BASE_64_URL | string, company?: CompanyProfile, pin?: string }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={2}
        progressStepCount={3}
        actions={[
          { type: 'link', text: 'Fill In Later', href: '/connection' },
          { type: 'submit', value: 'pin', text: 'Continue' },
        ]}
      >
       <div id="from-invite-invite-input" class="accented-container">
          <input
            id="from-invite-invite-input"
            class="new-connection-input-field"
            name="invite"
            value={props?.invite}
            type="hidden"
          />
          <input
            id="from-invite-invite-input"
            class="new-connection-input-field"
            name="companyNumber"
            value={props?.company?.company_number}
            type="hidden"
          />
          <input
            id="form-invite-pin-input"
            name="pin"
            class="new-connection-input-field"
            placeholder="Company House Number"
            required
            hx-get="/connection/new/verify-pin"
            hx-trigger="keyup changed delay:200ms, change, load"
            hx-target="#new-connection-feedback"
            hx-select="#new-connection-feedback"
            hx-swap="outerHTML"
            minlength={8}
            maxlength={8}
            oninput="this.reportValidity()"
            type="text"
          />
          <p>
            Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days
            to arrive, please wait for their verification and keep updated by viewing the verification status.
          </p>
        </div>
      </this.newConnectionForm>
    )
  }

  private fromInviteSuccess = (props: { feedback: FormFeedback }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="receive-invitation"
        feedback={props.feedback}
        progressStep={3}
        progressStepCount={3}
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
