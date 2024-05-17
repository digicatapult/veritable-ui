import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { CompanyProfile } from '../models/companyHouseEntity'
import { Page } from './common'

@singleton()
export default class newConnectionTemplates {
  constructor() {}

  public formPage = ({ targetBox }: { targetBox: JSX.Element }) => {
    return (
      <Page title="Veritable - New Connection" heading="New Connection" url="/connection/new">
        <this.companyNumberInput targetBox={targetBox} />
      </Page>
    )
  }

  public companyNumberInput = ({ targetBox }: { targetBox: JSX.Element }): JSX.Element => {
    return (
      <>
        <form id="new-connection-form" class="input-group" hx-swap="outerHTML">
          <input
            id="company-number-input"
            name="companyNumber"
            placeholder="Company House Number"
            required
            hx-get="/connection/new/verify-company"
            hx-trigger="change"
            hx-target="#text-box-target"
            hx-select="#text-box-target"
            pattern="^(((AC|CE|CS|FC|FE|GE|GS|IC|LP|NC|NF|NI|NL|NO|NP|OC|OE|PC|R0|RC|SA|SC|SE|SF|SG|SI|SL|SO|SR|SZ|ZC|\d{2})\d{6})|((IP|SP|RS)[A-Z\d]{6})|(SL\d{5}[\dA]))$"
            minlength={8}
            maxlength={8}
            oninput="this.reportValidity()"
          ></input>
          <input id="email" placeholder="Connection's Email Address" name="email"></input>
          <button id="btn-cancel">Cancel</button>
          <button id="btn-continue">Continue</button>
          <div id="text-box-target">{targetBox}</div>
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
    return (
      <>
        <p>{Html.escapeHtml(errorMessage)}</p>
      </>
    )
  }
}
