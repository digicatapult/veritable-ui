import Html from '@kitajs/html'
import isoCountries from 'i18n-iso-countries'

import { singleton } from 'tsyringe'
import { ConnectionRow, QueryRow, QueryType } from '../../models/db/types.js'
import {
  bavResponseData,
  CarbonEmbodimentRes,
  carbonEmbodimentResponseData,
  ProductAndQuantity,
} from '../../models/drpc.js'
import { bicRegex, CountryCode } from '../../models/strings.js'
import { FormButton, LinkButton, Page } from '../common.js'
import { typeMap } from './queryRequest.js'

export interface ResponseFormProps {
  formStage: 'form' | 'success' | 'error' | 'view'
  connection: ConnectionRow
  connections?: ConnectionRow[]
  partial?: boolean
  countryCode?: CountryCode
  query: QueryRow
  type: QueryType
}

export const bavResponseFields = ['accountId', 'clearingSystemId', 'iban', 'registrationId', 'bic'] as const
export type bavResponseField = (typeof bavResponseFields)[number]
const countryCodeToResponseMap: Partial<Record<CountryCode, bavResponseField[]>> = {
  GB: ['accountId', 'clearingSystemId'],
  US: ['accountId', 'clearingSystemId'],
  IN: ['accountId', 'clearingSystemId'],
  ID: ['accountId', 'bic'],
  NP: ['accountId'],
  PK: ['accountId', 'bic'],
  NG: ['accountId', 'bic'],
  CN: ['accountId'],
  KR: ['accountId', 'bic'],
  BD: ['accountId', 'bic'],
  BR: ['registrationId', 'iban'],
  MX: ['accountId'],
  UG: ['accountId', 'bic'],
  AR: ['accountId'],
  BE: ['registrationId', 'iban'],
  FR: ['registrationId', 'iban'],
  IT: ['iban'],
  NL: ['registrationId', 'iban'],
  PL: ['registrationId', 'iban'],
  MY: ['accountId', 'bic'],
  UY: ['accountId', 'bic'],
  PE: ['accountId'],
  TR: ['iban'],
  ZA: ['accountId', 'clearingSystemId'],
  TH: ['accountId', 'bic'],
}

const countries = Object.fromEntries(
  Object.entries(isoCountries.getNames('en', { select: 'official' })).filter(
    ([code]) => code in countryCodeToResponseMap
  )
)

@singleton()
export default class QueryResponseTemplates {
  constructor() {}

  public queryResponsePage = (props: ResponseFormProps) => {
    return (
      <Page
        title="Veritable - Query Response"
        activePage="queries"
        heading={`${typeMap[props.type].name} Query`}
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          {
            name: typeMap[props.type].name,
            url: `/queries/${props.query.id}/response`,
          },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.Body {...props} />
        </div>
      </Page>
    )
  }
  private Body = (props: ResponseFormProps): JSX.Element => {
    switch (props.formStage) {
      case 'form':
        return this.Form(props)
      case 'success':
        return <this.queryResponseSuccess {...props}></this.queryResponseSuccess>
      case 'error':
        return <this.queryResponseError {...props}></this.queryResponseError>
      case 'view':
        return <this.View {...props}></this.View>
    }
  }

  private Form = (props: ResponseFormProps) => {
    switch (props.type) {
      case 'total_carbon_embodiment':
        return <this.carbonEmbodimentResponseFormPage {...props} />
      case 'beneficiary_account_validation':
        return <this.bavResponseFormPage {...props} />
    }
  }

  private View = (props: ResponseFormProps) => {
    switch (props.type) {
      case 'total_carbon_embodiment':
        return <this.carbonEmbodimentView {...props} />
      case 'beneficiary_account_validation':
        return <this.bavView {...props} />
    }
  }

  private carbonEmbodimentResponseFormPage = ({
    partial = undefined,
    connections = [],
    query,
    ...props
  }: ResponseFormProps) => {
    const subjectId = ProductAndQuantity.parse(query.details.subjectId)

    return (
      <div class="container-query-form">
        <div class="query-form-left">
          <h1 id="co2-embodiment-heading">Total Carbon Embodiment</h1>
          <span>
            <p class="query-form-text">Provide the total carbon embodiment for the specified product/component.</p>
            <p class="query-form-text">
              If you do not have all the required information, please forward this query to your suppliers to gather
              their responses. Once you have all the necessary information, you can submit the final total.{''}
            </p>
          </span>
        </div>
        <div class="query-form-right">
          <p class="query-form-text">What is the total carbon embodiment for the product/component below?</p>
          <div hx-swap-oob="true" hx-swap="ignoreTitle:true" id="partial-query">
            <form
              id="carbon-embodiment"
              hx-post={`/queries/${query.id}/response/carbon-embodiment`}
              hx-select="main > *"
              hx-include={"[name='quantity'], [name='companyId'], [name='productId']"}
              hx-target="main"
              hx-swap="innerHTML"
            >
              <p>
                Product ID: {Html.escapeHtml(subjectId.content.productId)}
                <br />
                Quantity: {Html.escapeHtml(subjectId.content.quantity)}
              </p>
              <input type="hidden" name="companyId" value={Html.escapeHtml(props.connection.id)} />
              <div class="input-container">
                <label for="co2-embodiment-input" class="input-label">
                  Total carbon from my operations only (Scope 1 & 2)
                </label>
                <input
                  id="co2-embodiment-input"
                  name="emissions"
                  placeholder="Value in kg CO2e (to be aggregated)"
                  class="input-with-label"
                  type="text"
                  required={true}
                />
              </div>
              <div class="input-container">
                <p>
                  Do you need to ask other companies in your supply chain how much carbon they contributed? (Scope 3)
                </p>
                <div class="row">
                  <input
                    hx-trigger="changed, click"
                    hx-target="#partial-query"
                    hx-get={`/queries/${query.id}/partial`}
                    id="partial-response-input"
                    name="partialQuery"
                    type="radio"
                    checked={partial}
                  />
                  <label for="partial-response-input">Yes</label>
                  <input
                    hx-trigger="changed, click"
                    hx-target="#partial-query"
                    hx-get={`/queries/${query.id}/partial`}
                    id="partial-response-input"
                    type="radio"
                    checked={partial !== undefined && !partial}
                  />
                  <label for="partial-response-input">No</label>
                </div>
              </div>
              {partial && connections ? (
                <div class="query-partial-container list-page">
                  <p style={{ fontStyle: 'italic', fontSize: '14px;' }}>
                    Select which suppliers contributed to the carbon embodiment of this product/component. Their
                    responses will be automatically added to your total carbon embodiment.{' '}
                  </p>
                  <table>
                    <thead>
                      {['Select', 'Company Name', 'Product ID', 'Quantity'].map((name: string) => (
                        <th>{Html.escapeHtml(name)}</th>
                      ))}
                    </thead>
                    <tbody hx-swap-oob="true">
                      {connections.length == 0 ? (
                        <tr>
                          <td>No Connections found</td>
                        </tr>
                      ) : (
                        connections.map((connection) => this.tableRow(connection))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : undefined}
              <br />
              <FormButton text="Submit Response" style="filled" />
            </form>
          </div>
        </div>
      </div>
    )
  }

  private multFactor = (unit: 'ug' | 'mg' | 'g' | 'kg' | 'tonne'): number => {
    switch (unit) {
      case 'ug':
        return 1e-9
      case 'mg':
        return 1e-6
      case 'g':
        return 1e-3
      case 'kg':
        return 1
      case 'tonne':
        return 1e3
    }
  }

  private reduceResponse = (data: CarbonEmbodimentRes['data']): number => {
    return (
      data.mass * this.multFactor(data.unit) +
      data.partialResponses.reduce((acc, r) => {
        return acc + this.reduceResponse(r.data)
      }, 0)
    )
  }

  private bavResponseFormPage = ({ query, connection }: ResponseFormProps) => {
    return (
      <div class="container-query-form">
        <div class="query-form-left">
          <h1>Beneficiary Account Validation</h1>
          <span>
            <p class="query-form-text">Provide your company's financial details</p>
          </span>
        </div>
        <div class="query-form-right">
          <div class="input-container">
            <label for="country-select" class="input-label">
              Country
            </label>
            <select
              id="country-select"
              name="countryCode"
              class="input-with-label"
              hx-get="/queries/bav-response-fields"
              hx-trigger="change"
              hx-target="#bav-form-fields"
              hx-include="[name=countryCode]"
              hx-swap="innerHTML"
              required
            >
              <option value="">Select country</option>
              {Object.entries(countries).map(([countryCode, name]) => (
                <option value={countryCode}>{Html.escapeHtml(name)}</option>
              ))}
            </select>
          </div>
          <form
            id="bav-form"
            hx-post={`/queries/${query.id}/response/bav`}
            hx-select="main > *"
            hx-include={
              "[name='countryCode'], [name='bic'], [name='name'], [name='accountId'], [name='clearingSystemId'], [name='iban'], [name='registrationId']"
            }
            hx-target="main"
          >
            <input type="hidden" name="connectionId" value={Html.escapeHtml(connection.id)} />
            <div id="bav-form-fields">
              <this.bavForm />
            </div>
          </form>
        </div>
      </div>
    )
  }

  public bavForm = ({ countryCode }: { countryCode?: CountryCode }) => {
    const formFieldsToShow = countryCode ? (countryCodeToResponseMap[countryCode] ?? bavResponseFields) : []

    return (
      <>
        {countryCode && (
          <div class="input-container">
            <label for="bav-name-input" class="input-label">
              Account Name
            </label>
            <input id="bav-name-input" name="name" class="input-with-label" type="text" required />
          </div>
        )}
        {formFieldsToShow.includes('accountId') && (
          <div class="input-container">
            <label for="bav-account-id-input" class="input-label">
              Account Number
            </label>
            <input id="bav-account-id-input" name="accountId" class="input-with-label" type="text" required />
          </div>
        )}
        {formFieldsToShow.includes('clearingSystemId') && (
          <div class="input-container">
            <label for="bav-clearing-system-id-input" class="input-label">
              Clearing System ID
            </label>
            <input
              id="bav-clearing-system-id-input"
              name="clearingSystemId"
              class="input-with-label"
              type="text"
              required
            />
          </div>
        )}
        {formFieldsToShow.includes('iban') && (
          <div class="input-container">
            <label for="bav-iban-input" class="input-label">
              IBAN
            </label>
            <input id="bav-iban-input" name="iban" class="input-with-label" type="text" required />
          </div>
        )}
        {formFieldsToShow.includes('registrationId') && (
          <div class="input-container">
            <label for="bav-registration-id-input" class="input-label">
              Registration ID
            </label>
            <input id="bav-registration-id-input" name="registrationId" class="input-with-label" type="text" required />
          </div>
        )}
        {formFieldsToShow.includes('bic') && (
          <div class="input-container">
            <label for="bav-bic-input" class="input-label">
              Bank Identifier Code
            </label>
            <input
              id="bav-bic-input"
              name="bic"
              placeholder="AAAABBCC123"
              class="input-with-label"
              type="text"
              required
              pattern={bicRegex.source}
              title="Valid BIC (4 letters, 2 country letters, 2 alphanumeric, optional 3 more alphanumeric)"
            />
          </div>
        )}
        {countryCode && <FormButton text="Submit Response" style="filled" />}
      </>
    )
  }

  private carbonEmbodimentView = ({ query, connection }: ResponseFormProps): JSX.Element => {
    if (!query.response) {
      throw new Error('Cannot view query response without a response')
    }

    const subjectId = ProductAndQuantity.parse(query.details.subjectId)
    const responseData = carbonEmbodimentResponseData.parse(query.response)

    return (
      <div class="container-query-form">
        <div class="query-form-left">
          <h1>Total Carbon Embodiment</h1>
          <p class="query-form-text">
            A query for calculating the total carbon embodiment for a given product or component.
          </p>
        </div>
        <div class="query-form-right">
          <div class="row">
            <h2>Query Information</h2>
            <div style={{ maxHeight: '25px' }} class="list-item-status" data-status="success">
              Resolved
            </div>
          </div>
          <br />
          <table class="query-response-view">
            <tr>
              <td>Account name:</td>
              <td class="query-results-left-padding-table">{Html.escapeHtml(connection.company_name)}</td>
            </tr>
            <tr>
              <td>Product ID:</td>
              <td class="query-results-left-padding-table">{Html.escapeHtml(subjectId.content.productId)}</td>
            </tr>
            <tr>
              <td>Quantity:</td>
              <td class="query-results-left-padding-table">{Html.escapeHtml(subjectId.content.quantity)}</td>
            </tr>
            <tr>
              <td>Query:</td>
              <td class="query-results-left-padding-table">
                Please provide details on the total carbon embodiment associated with the product.
              </td>
            </tr>
          </table>
          <h2>Response Information</h2>
          <table class="query-response-view">
            <tr>
              <td>Date Certified:</td>
              <td class="query-results-left-padding-table">
                <time>{Html.escapeHtml(new Date(query.updated_at))}</time>
              </td>
            </tr>
            <tr>
              <td>Carbon Emissions:</td>
              <td class="query-results-left-padding-table">
                {Html.escapeHtml(this.reduceResponse(responseData))} kg CO2e
              </td>
            </tr>
          </table>
          <LinkButton text="Back to Queries" href="/queries" style="filled" />
        </div>
      </div>
    )
  }

  public tableRow = ({
    checked = false,
    ...props
  }: {
    company_number: string
    id: string
    company_name: string
    productId?: string
    quantity?: number
    checked?: boolean
  }): JSX.Element => {
    return (
      <tr id={`tr-${props.id}`} hx-swap-oob="true">
        <input name="connectionIds" type="hidden" value={Html.escapeHtml(props.id)} disabled={!checked} />
        <td>
          <input
            name={`partialSelect`}
            type="checkbox"
            hx-trigger="click"
            checked={checked}
            hx-get={`/queries/partial-select/${props.id}`}
            hx-target={`#tr-${props.id}`}
            aria-label="select partial query"
          />
        </td>
        <td>{Html.escapeHtml(props.company_name)}</td>
        <td>
          <input
            name="productIds"
            placeholder="Product ID"
            class={`input-basic ${checked ? '' : 'disabled'}`}
            type="text"
            disabled={!checked}
            required={checked}
          />
        </td>
        <td>
          <input
            name="quantities"
            placeholder="Quantity"
            class={`input-basic ${checked ? '' : 'disabled'}`}
            type="number"
            disabled={!checked}
            required={checked}
          />
        </td>
      </tr>
    )
  }

  private bavView = ({ query, connection }: ResponseFormProps): JSX.Element => {
    if (!query.response) {
      throw new Error('Cannot view query response without a response')
    }

    const responseData = bavResponseData.parse(query.response)

    return (
      <div class="container-query-form">
        <div class="query-form-left">
          <h1>Beneficiary Account Validation</h1>
          <p class="query-form-text">A query to verify a company's financial details</p>
        </div>
        <div class="query-form-right">
          <div class="row">
            <h2>Query Information</h2>
            <div style={{ maxHeight: '25px' }} class="list-item-status" data-status="success">
              Resolved
            </div>
          </div>
          <br />
          <table class="query-response-view">
            <tr>
              <td>Company name:</td>
              <td class="query-results-left-padding-table">{Html.escapeHtml(connection.company_name)}</td>
            </tr>
            <tr>
              <td>Query:</td>
              <td class="query-results-left-padding-table">Provide your company's financial details</td>
            </tr>
          </table>
          <h2>Response Information</h2>
          <table class="query-response-view">
            <tr>
              <td>Timestamp:</td>
              <td class="query-results-left-padding-table">
                <time>{Html.escapeHtml(new Date(query.updated_at))}</time>
              </td>
            </tr>
            <this.bavResponseRow heading={'Country'} value={isoCountries.getName(responseData.countryCode, 'en')} />
            <this.bavResponseRow heading={'Name'} value={responseData.name} />
            <this.bavResponseRow heading={'Bank Identifier Code'} value={responseData.bic} />
            <this.bavResponseRow heading={'IBAN'} value={responseData.iban} />
            <this.bavResponseRow heading={'Account ID'} value={responseData.accountId} />
            <this.bavResponseRow heading={'Clearing System ID'} value={responseData.clearingSystemId} />
            <this.bavResponseRow heading={'Registration ID'} value={responseData.registrationId} />
          </table>

          {query.role === 'requester' && (
            <>
              <div class="row">
                <h2>Verification</h2>
                <button
                  id="bav-verify-button"
                  class="button"
                  data-variant="action"
                  hx-post="response/bav/verify"
                  hx-target="#bav-verification-results"
                  hx-indicator="#bav-verification-results"
                  hx-swap="outerHTML"
                >
                  Verify
                </button>
              </div>
              <this.bavVerificationResults
                score={responseData.score}
                description={responseData.description}
                connectionId={connection.id}
              />
            </>
          )}
          <LinkButton text="Back to Queries" href="/queries" style="filled" />
        </div>
      </div>
    )
  }

  public bavVerificationResults = ({
    score,
    description,
    connectionId,
  }: {
    score?: number
    description?: string
    connectionId: string
  }): JSX.Element => {
    const strongMatchTooltip = `Account details match.`
    const partialMatchTooltip = `Account found. Potential typo in name.`
    const weakMatchTooltip = `Account found. Name does not match.`
    const noMatchTooltip = `Account not found.`

    const options = [
      { threshold: 0.95, tooltip: strongMatchTooltip, icon: 'tick', offerNewQuery: false },
      { threshold: 0.5, tooltip: partialMatchTooltip, icon: 'tilde', offerNewQuery: true },
      { threshold: 0, tooltip: weakMatchTooltip, icon: 'tilde', offerNewQuery: true },
      { threshold: -Infinity, tooltip: noMatchTooltip, icon: 'cross', offerNewQuery: true },
    ]
    const option = options.find((o) => score! > o.threshold)

    return (
      <div id="bav-verification-results">
        <table class={`query-response-view`}>
          <tr>
            <td>Description:</td>
            <td id="bav-verification-results-details" class="query-results-left-padding-table" title={option?.tooltip}>
              {score !== undefined && description !== undefined ? (
                <>
                  {Html.escapeHtml(description)}
                  <span class={`bav-verify-icon ${option?.icon}`} />
                  {option?.offerNewQuery && (
                    <a
                      class="button"
                      data-variant="action"
                      href={`/queries/new?type=beneficiary_account_validation&connectionId=${connectionId}`}
                    >
                      Send new query
                    </a>
                  )}
                </>
              ) : (
                'Awaiting request'
              )}
            </td>
          </tr>
        </table>
        <div id="spinner" />
      </div>
    )
  }

  private bavResponseRow = ({ heading, value }: { heading: string; value?: string }): JSX.Element | null => {
    if (value === undefined) return null

    return (
      <tr>
        <td>{Html.escapeHtml(heading)}:</td>
        <td class="query-results-left-padding-table">{Html.escapeHtml(value)}</td>
      </tr>
    )
  }

  private queryResponseSuccess = (props: ResponseFormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <h2>Thank you for your response!</h2>
        <p>You have successfully forwarded a ${typeMap[props.type].name} query to the following supplier(s):</p>
        <i>
          <p>{Html.escapeHtml(props.connection.company_name)}</p>
        </i>
        <p>
          Once all supplier responses are received, they will be automatically gathered and securely sent to Alice’s
          Company. You do not need to take any further action. The process is fully automated, ensuring transparency and
          trust in the final result.
        </p>
        <p>You can check the status of your forwarded queries in the Queries section of your dashboard.</p>
        <br />
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }

  private queryResponseError = (props: ResponseFormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          There has been an error when responding to the query by following company:{' '}
          {Html.escapeHtml(props.connection.company_name)}.
        </p>
        <p>Please try again or contact the respective company to resolve this issue.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
}
