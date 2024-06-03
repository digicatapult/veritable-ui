import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { CompanyProfile } from '../models/companyHouseEntity.js'
import { COMPANY_NUMBER, EMAIL, companyNumberRegex } from '../models/strings.js'
import { ButtonIcon, FormButton, Page } from './common.js'

export type CompanyProfileText =
  | {
      status: 'success'
      company: CompanyProfile
    }
  | {
      status: 'error'
      errorMessage: string
    }

export type FormStage = 'form' | 'confirmation' | 'success'

@singleton()
export default class newConnectionTemplates {
  constructor() {}

  public formPage = (targetBox: CompanyProfileText, formStage: FormStage) => {
    return (
      <Page title="Veritable - New Connection" heading="New Connection" url="/connection/new">
        <div class="connections header">
          <span>Invite New Connection</span>
        </div>
        <div class="connections list ">
          <this.companyFormInput targetBox={targetBox} formStage={formStage} />
        </div>
      </Page>
    )
  }

  public companyFormInput = (params: {
    targetBox: CompanyProfileText
    formStage: FormStage
    email?: EMAIL
    companyNumber?: COMPANY_NUMBER
  }): JSX.Element => {
    const showForm = params.formStage === 'form' ? true : false
    const showConfirmation = params.formStage === 'confirmation' ? true : false
    const showSuccess = params.formStage === 'success' ? true : false
    return (
      <>
        <form id="new-connection-form" hx-post="/connection/new/submit" hx-swap="outerHTML">
          <this.stepper formStage={params.formStage} />
          <div class="align-horizontally">
            <div>
              <div class="align-vertically ">
                <input
                  id="company-number-input"
                  name="companyNumber"
                  class="new connection "
                  placeholder="Company House Number"
                  required
                  hx-get="/connection/new/verify-company"
                  hx-trigger="keyup changed delay:200ms, change"
                  hx-target="#text-box-target"
                  hx-select="#text-box-target"
                  pattern={companyNumberRegex.source}
                  minlength={8}
                  maxlength={8}
                  oninput="this.reportValidity()"
                  value={params.companyNumber}
                  type={`${showForm ? 'text' : 'hidden'}`}
                ></input>
                <input
                  required
                  id="email"
                  class="new connection"
                  placeholder="Connection's Email Address"
                  name="email"
                  value={params.email}
                  type={`${showForm ? 'email' : 'hidden'}`}
                ></input>
              </div>
              <div
                id="confirmation-page"
                class="small text centered"
                style={{ display: showConfirmation ? 'block' : 'none' }}
              >
                <p>Please confirm the details of the connection before sending</p>
                <p>
                  {Html.escapeHtml(
                    `Company House Number: ${params.targetBox.status === 'success' && params.targetBox.company.company_number}`
                  )}
                </p>
                <p>{Html.escapeHtml(`Email Address: ${params.targetBox.status === 'success' && params.email}`)}</p>
                <p>After clicking submit, a connection invitation will be sent to their email and postal address.</p>
              </div>
              <div id="success-page" class="small text centered" style={{ display: showSuccess ? 'block' : 'none' }}>
                <p>
                  Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3
                  days to arrive, please wait for their verification and keep updated by viewing the verification
                  status.
                </p>
              </div>
              <div class="align-horizontally ">
                <div style={{ display: showConfirmation ? 'none' : 'block' }}>
                  <ButtonIcon name={showForm ? 'Cancel' : 'Back To Home'} href="/connection" />
                </div>

                <FormButton
                  type="submit"
                  name="submitButton"
                  value="Back"
                  display={showConfirmation ? 'block' : 'none'}
                />
                <FormButton
                  type="submit"
                  name="submitButton"
                  value={`${showForm ? 'Continue' : 'Submit'}`}
                  display={showSuccess ? 'none' : 'block'}
                />
              </div>
            </div>

            <div id="text-box-target" style={{ display: showForm ? 'block' : 'none' }}>
              {params.targetBox.status === 'error' ? (
                <this.companyEmptyTextBox errorMessage={params.targetBox.errorMessage} />
              ) : (
                <div class="small text align-horizontally">
                  <div>
                    <this.companyFilledTextBox company={params.targetBox.company} />
                  </div>
                  <div>
                    <img src="/public/images/check.svg" alt="Description of the image" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </>
    )
  }

  public companyFilledTextBox = ({ company }: { company: CompanyProfile }): JSX.Element => {
    return (
      <>
        <span class="header small">Registered Office Address</span>

        <p>{Html.escapeHtml(company.company_name)}</p>
        <p>{Html.escapeHtml(company.registered_office_address.address_line_1)}</p>
        {company?.registered_office_address?.address_line_2 && (
          <p>{Html.escapeHtml(company.registered_office_address.address_line_2)}</p>
        )}
        {company?.registered_office_address?.address_line_2 && (
          <p>{Html.escapeHtml(company.registered_office_address.address_line_2)}</p>
        )}
        {company?.registered_office_address?.care_of && (
          <p>{Html.escapeHtml(company.registered_office_address.care_of)}</p>
        )}
        {company?.registered_office_address?.locality && (
          <p>{Html.escapeHtml(company.registered_office_address.locality)}</p>
        )}
        {company?.registered_office_address?.po_box && (
          <p>{Html.escapeHtml(company.registered_office_address.po_box)}</p>
        )}
        {company?.registered_office_address?.postal_code && (
          <p>{Html.escapeHtml(company.registered_office_address.postal_code)}</p>
        )}
        {company?.registered_office_address?.country && (
          <p>{Html.escapeHtml(company.registered_office_address.country)}</p>
        )}
        {company?.registered_office_address?.premises && (
          <p>{Html.escapeHtml(company.registered_office_address.premises)}</p>
        )}
        {company?.registered_office_address?.region && (
          <p>{Html.escapeHtml(company.registered_office_address.region)}</p>
        )}

        <span class="header small">Registered Office Address</span>

        <p>{Html.escapeHtml(company.company_status)}</p>
      </>
    )
  }

  public companyEmptyTextBox = ({ errorMessage }: { errorMessage: string }): JSX.Element => {
    return <p>{Html.escapeHtml(errorMessage)}</p>
  }

  public stepper = (params: { formStage: FormStage }): JSX.Element => {
    if (params.formStage === 'form') {
      return (
        <>
          <div class="progress-container">
            <div class="progress-bar bar-1-3"></div>
            <div class="progress-text">Step 1 of 3</div>
          </div>
        </>
      )
    } else if (params.formStage === 'confirmation') {
      return (
        <>
          <div class="progress-container">
            <div class="progress-bar bar-2-3"></div>
            <div class="progress-text">Step 2 of 3</div>
          </div>
        </>
      )
    } else if (params.formStage === 'success') {
      return (
        <>
          <div class="progress-container">
            <div class="progress-bar bar-3-3"></div>
            <div class="progress-text">Step 3 of 3</div>
          </div>
        </>
      )
    } else {
      return <div>Stage Undefined</div>
    }
  }
}
