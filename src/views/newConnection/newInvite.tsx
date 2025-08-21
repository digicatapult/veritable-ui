import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { COMPANY_NUMBER, companyNumberRegex, CountryCode, EMAIL } from '../../models/stringTypes.js'
import { Page } from '../common.js'
import { FormFeedback, NewConnectionTemplates } from './base.js'

export type NewInviteFormStage = 'form' | 'confirmation' | 'success'

@singleton()
export class NewInviteTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public newInviteFormPage = (feedback: FormFeedback, registryCountryCode?: CountryCode) => {
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
          <this.newInviteForm feedback={feedback} formStage="form" registryCountryCode={registryCountryCode} />
        </div>
      </Page>
    )
  }

  public newInviteForm = (props: {
    formStage: NewInviteFormStage
    companyNumber?: COMPANY_NUMBER
    email?: EMAIL
    registryCountryCode?: CountryCode
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
    registryCountryCode?: CountryCode
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
        <div id="new-invite-country-with-code">
          <select
            id="new-invite-country-select"
            name="registryCountryCode"
            required
            value={props.registryCountryCode}
            hx-get="/connection/new"
            hx-trigger="change"
            hx-target="#dynamic-invite-form-content"
            hx-select="#dynamic-invite-form-content"
            hx-swap="outerHTML"
            hx-include="this"
            onchange="document.getElementById('new-invite-country-code-display').value = this.value;"
          >
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
          <input id="new-invite-country-code-display" type="text" readonly value={props.registryCountryCode} />
        </div>

        <div id="dynamic-invite-form-content">
          <p>Configured registries for this country </p>
          {props.feedback.type == 'message' && Html.escapeHtml(props.feedback.registryOptionsPerCountry) && (
            <div class="registry-selection">
              {/* Country Registry Button - only show if there are country registries */}
              {props.feedback.registryOptionsPerCountry.countryRegistries.length > 0 && (
                <div class="registry-option">
                  <input
                    id="country-registry-radio"
                    type="radio"
                    name="selectedRegistry"
                    value={props.feedback.registryOptionsPerCountry.countryRegistries[0].registry_key}
                    checked={true}
                  />
                  <label for="country-registry-radio">
                    {Html.escapeHtml(props.feedback.registryOptionsPerCountry.countryRegistries[0].registry_name)}
                  </label>
                </div>
              )}

              {/* Third Party Registry Button - only show if there are third party registries */}
              {props.feedback.registryOptionsPerCountry.thirdPartyRegistries.length > 0 && (
                <div class="registry-option">
                  <input
                    id="third-party-registry-radio"
                    type="radio"
                    name="selectedRegistry"
                    value={props.feedback.registryOptionsPerCountry.thirdPartyRegistries[0].registry_key}
                  />
                  <label for="third-party-registry-radio">
                    {Html.escapeHtml(props.feedback.registryOptionsPerCountry.thirdPartyRegistries[0].registry_name)}
                  </label>
                  <span
                    id="third-party-registry-info-icon"
                    title="Third-party registries are external data providers that aggregate company information from multiple sources. We use OpenCorporates, a comprehensive database of company information from around the world."
                  >
                    i
                  </span>
                </div>
              )}
            </div>
          )}

          <input
            id="new-invite-company-number-input"
            name="companyNumber"
            placeholder="Companie's Number or ID"
            required
            hx-get="/connection/new/verify-company"
            hx-trigger="keyup changed delay:200ms, change, load"
            hx-target="#new-connection-feedback"
            hx-select="#new-connection-feedback"
            hx-swap="outerHTML"
            hx-include="#dynamic-invite-form-content, #new-invite-country-select"
            pattern={
              props.feedback.type === 'message' && props.feedback.regex
                ? props.feedback.regex
                : companyNumberRegex.source
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
        </div>
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
        <input id="new-invite-email-input" name="email" value={props.email} type="hidden"></input>,
        {/* todo: add this onto SharedOrgInfo */}
        <input
          id="new-invite-selected-registry-input"
          name="selectedRegistry"
          value={props.feedback.type === 'companyFound' ? props.feedback.company.selectedRegistry : ''}
          type="hidden"
        />
        <input
          id="new-invite-registry-country-code-input"
          name="registryCountryCode"
          value={props.feedback.type === 'companyFound' ? props.feedback.company.registryCountryCode : ''}
          type="hidden"
        />
        <div id="new-connection-confirmation-text">
          <p>Please confirm the details of the connection before sending</p>
          <p>
            {' '}
            {Html.escapeHtml(props.feedback.type === 'companyFound' && props.feedback.company.registryCountryCode)}
          </p>
          <p>
            {Html.escapeHtml(
              `Company Number: ${props.feedback.type === 'companyFound' && props.feedback.company.number}`
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
