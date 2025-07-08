import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { COMPANY_NUMBER, companyNumberRegex, EMAIL } from '../../models/strings.js'
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
        activePage="connections"
        headerLinks={[
          { name: 'Connections', url: '/connection' },
          { name: 'Invite New Connection', url: '/connection/new' },
        ]}
        stylesheets={['connection.css']}
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
    countryCode?: string
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
    countryCode?: string
    feedback: FormFeedback
  }): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="new/create-invitation"
        feedback={props.feedback}
        progressStep={1}
        progressStepCount={3}
        actions={[
          { type: 'link', text: 'Cancel', href: '/connection' },
          { type: 'submit', value: 'continue', text: 'Continue' },
        ]}
      >
        <select
          id="new-invite-country-select"
          name="countryCode"
          required
          value={props.countryCode}
          hx-get="/connection/new/update-pattern"
          hx-trigger="change"
          hx-target="#new-invite-company-number-input"
          hx-select="#new-invite-company-number-input"
          hx-swap="outerHTML"
          hx-include="this"
        >
          <option value="UK">United Kingdom</option>
          <option value="NY">New York</option>
        </select>
        <input
          id="new-invite-company-number-input"
          name="companyNumber"
          placeholder="Company House Number"
          required
          hx-get="/connection/new/verify-company"
          hx-trigger="keyup changed delay:200ms, change, load"
          hx-target="#new-connection-feedback"
          hx-select="#new-connection-feedback"
          hx-swap="outerHTML"
          hx-include="#new-invite-country-select"
          pattern={
            props.feedback.type === 'message' && props.feedback.regex ? props.feedback.regex : companyNumberRegex.source
          }
          minlength={props.feedback.type === 'message' && props.feedback.minlength ? props.feedback.minlength : 6}
          maxlength={props.feedback.type === 'message' && props.feedback.maxlength ? props.feedback.maxlength : 10}
          oninput="this.reportValidity()"
          value={props.companyNumber}
          type="text"
        ></input>

        <input
          required
          id="new-invite-email-input"
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
        submitRoute="new/create-invitation"
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
          name="companyNumber"
          value={props.companyNumber}
          type="hidden"
        ></input>
        <input id="new-invite-email-input" name="email" value={props.email} type="hidden"></input>
        <input
          id="new-invite-country-code-input"
          name="countryCode"
          value={props.feedback.type === 'companyFound' ? props.feedback.company.countryCode : ''}
          type="hidden"
        ></input>
        <div id="new-connection-confirmation-text">
          <p>Please confirm the details of the connection before sending</p>
          <p> {Html.escapeHtml(props.feedback.type === 'companyFound' && props.feedback.company.countryCode)}</p>
          <p>
            {Html.escapeHtml(
              `Company House Number: ${props.feedback.type === 'companyFound' && props.feedback.company.number}`
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
        submitRoute="new/create-invitation"
        feedback={props.feedback}
        progressStep={3}
        progressStepCount={3}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="new-connection-confirmation-text">
          <p>
            Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3 days
            to arrive, please wait for their verification and keep updated by viewing the verification status.
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
