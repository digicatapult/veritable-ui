import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { COMPANY_NUMBER, EMAIL, companyNumberRegex } from '../../models/strings.js'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'

export type NewInviteFormStage = 'form' | 'confirmation' | 'success'

@singleton()
export class NewInviteTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public newInviteFormPage = (feedback: FormFeedback) => {
    return (
      <Page
        title="Veritable - New Connection"
        heading="New Connection"
        headerLinks={[
          { name: 'Connections', url: '/connection' },
          { name: 'Invite New Connection', url: '/connection/new' },
        ]}
        stylesheets={['new-invite.css']}
      >
        <div class="connections header">
          <span>Invite New Connection</span>
        </div>
        <div class="card-body">
          <this.newInviteForm feedback={feedback} formStage="form" />
        </div>
      </Page>
    )
  }

  public newInviteForm = (props: {
    formStage: NewInviteFormStage
    companyNumber?: COMPANY_NUMBER
    email?: EMAIL
    feedback: FormFeedback
  }): JSX.Element => {
    switch (props.formStage) {
      case 'form':
        return <this.newInviteInput {...props}></this.newInviteInput>
      case 'confirmation':
        return <this.newInviteConfirmation {...props}></this.newInviteConfirmation>
      case 'success':
        return <this.newInviteSuccess {...props}></this.newInviteSuccess>
    }
  }

  private newInviteInput = (props: {
    companyNumber?: COMPANY_NUMBER
    email?: EMAIL
    feedback: FormFeedback
  }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="create-invitation"
        feedback={props.feedback}
        progressStep={1}
        progressStepCount={3}
        actions={[
          { type: 'link', text: 'Cancel', href: '/connection' },
          { type: 'submit', value: 'continue', text: 'Continue' },
        ]}
      >
        <input
          id="new-invite-company-number-input"
          name="companyNumber"
          class="new-connection-input-field"
          placeholder="Company House Number"
          required
          hx-get="/connection/new/verify-company"
          hx-trigger="keyup changed delay:200ms, change, load"
          hx-target="#new-connection-feedback"
          hx-select="#new-connection-feedback"
          hx-swap="outerHTML"
          pattern={companyNumberRegex.source}
          minlength={8}
          maxlength={8}
          oninput="this.reportValidity()"
          value={props.companyNumber}
          type="text"
        ></input>
        <input
          required
          id="new-invite-email-input"
          class="new-connection-input-field"
          placeholder="Connection's Email Address"
          name="email"
          value={props.email}
          type="email"
        ></input>
      </this.newConnectionForm>
    )
  }

  private newInviteConfirmation = (props: {
    companyNumber?: COMPANY_NUMBER
    email?: EMAIL
    feedback: FormFeedback
  }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="create-invitation"
        feedback={props.feedback}
        progressStep={2}
        progressStepCount={3}
        actions={[
          { type: 'submit', value: 'back', text: 'Back' },
          { type: 'submit', value: 'submit', text: 'Submit' },
        ]}
      >
        <input
          id="new-invite-company-number-input"
          class="new-connection-input-field"
          name="companyNumber"
          value={props.companyNumber}
          type="hidden"
        ></input>
        <input
          id="new-invite-email-input"
          class="new-connection-input-field"
          name="email"
          value={props.email}
          type="hidden"
        ></input>
        <div id="new-invite-confirmation-text">
          <p>Please confirm the details of the connection before sending</p>
          <p>
            {Html.escapeHtml(
              `Company House Number: ${props.feedback.type === 'companyFound' && props.feedback.company.company_number}`
            )}
          </p>
          <p>{Html.escapeHtml(`Email Address: ${props.feedback.type === 'companyFound' && props.email}`)}</p>
          <p>After clicking submit, a connection invitation will be sent to their email and postal address.</p>
        </div>
      </this.newConnectionForm>
    )
  }

  private newInviteSuccess = (props: { feedback: FormFeedback }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="create-invitation"
        feedback={props.feedback}
        progressStep={3}
        progressStepCount={3}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="new-invite-confirmation-text">
          <p>
            Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days
            to arrive, please wait for their verification and keep updated by viewing the verification status.
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
