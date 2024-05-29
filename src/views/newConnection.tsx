import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { CompanyProfile } from '../models/companyHouseEntity.js'
import { COMPANY_NUMBER, EMAIL, companyNumberRegex } from '../models/strings.js'
import { FormButton, Page } from './common.js'

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
        <this.companyFormInput targetBox={targetBox} formStage={formStage} />
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
        <form
          id="new-connection-form"
          hx-post="/connection/new/submit"
          hx-swap="outerHTML"
          hx-vals={`{"formStage": "${params.formStage}"}`}
        >
          <div>
            <this.stepper formStage={params.formStage} />
            <input
              id="company-number-input"
              class="new connection"
              name="companyNumber"
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
              id="email"
              placeholder="Connection's Email Address"
              name="email"
              value={params.email}
              type={`${showForm ? 'email' : 'hidden'}`}
            ></input>
            <div id="confirmation-page" style={{ display: showConfirmation ? 'block' : 'none' }}>
              <p>Please confirm the details of the connection before sending</p>
              <p>
                {Html.escapeHtml(
                  `Company House Number: ${params.targetBox.status === 'success' && params.targetBox.company.company_number}`
                )}
              </p>
              <p>{Html.escapeHtml(`Email Address: ${params.targetBox.status === 'success' && params.email}`)}</p>
            </div>
            <div id="success-page" style={{ display: showSuccess ? 'block' : 'none' }}>
              <p>
                Your connection invitation has been sent. Please wait for their verification. As the post may take 2-3
                days to arrive, please wait for their verification and keep updated by viewing the verification status.
              </p>
            </div>
            <a class="button" href="/connection" style={{ display: showConfirmation ? 'none' : 'block' }}>
              {showForm ? 'Cancel' : 'Back To Home'}
            </a>
            <FormButton type="submit" name="submitButton" value="Back" display={showConfirmation ? 'block' : 'none'} />
            <FormButton
              type="submit"
              name="submitButton"
              value={`${showForm ? 'Continue' : 'Submit'}`}
              display={showSuccess ? 'none' : 'block'}
            />
          </div>
          <div id="text-box-target" style={{ display: showForm ? 'block' : 'none' }}>
            {params.targetBox.status === 'error' ? (
              <this.companyEmptyTextBox errorMessage={params.targetBox.errorMessage} />
            ) : (
              <this.companyFilledTextBox company={params.targetBox.company} />
            )}
          </div>
        </form>
      </>
    )
  }

  public companyFilledTextBox = ({ company }: { company: CompanyProfile }): JSX.Element => {
    return (
      <>
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
        <p>{Html.escapeHtml(company.company_status)}</p>
      </>
    )
  }

  public companyEmptyTextBox = ({ errorMessage }: { errorMessage: string }): JSX.Element => {
    return <>{Html.escapeHtml(errorMessage)}</>
  }

  public stepper = (params: { formStage: FormStage }): JSX.Element => {
    if (params.formStage === 'form') {
      return <div>-----Step 1</div>
    } else if (params.formStage === 'confirmation') {
      return <div>----------Step 2</div>
    } else if (params.formStage === 'success') {
      return <div>---------------Step 3</div>
    } else {
      return <div>Stage Undefined</div>
    }
  }
}
