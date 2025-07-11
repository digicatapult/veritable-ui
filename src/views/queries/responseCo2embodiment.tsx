import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow, QueryRow } from '../../models/db/types.js'
import { CarbonEmbodimentRes, carbonEmbodimentResponseData, ProductAndQuantity } from '../../models/drpc.js'
import { FormButton, LinkButton, Page } from '../common.js'

export type CarbonEmbodimentFormStage = 'form' | 'success' | 'error'
export interface CarbonEmbodimentFormProps {
  formStage: CarbonEmbodimentFormStage
  company: ConnectionRow
  connections?: ConnectionRow[]
  partial?: boolean
  query: QueryRow
}

@singleton()
export default class CarbonEmbodimentResponseTemplates {
  constructor() {}

  public newCarbonEmbodimentResponseFormPage = ({
    formStage,
    company,
    query,
    partial,
    connections,
  }: CarbonEmbodimentFormProps) => {
    const subjectId = ProductAndQuantity.parse(query.details.subjectId)
    return (
      <Page
        title="Veritable - Select Company"
        activePage="queries"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          {
            name: `Query Request ${subjectId.content.productId}`,
            url: `/queries/carbon-embodiment/${query.id}/response`,
          },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.carbonEmbodiment
            formStage={formStage}
            company={company}
            query={query}
            partial={partial}
            connections={connections}
          />
        </div>
      </Page>
    )
  }
  public carbonEmbodiment = (props: CarbonEmbodimentFormProps): JSX.Element => {
    switch (props.formStage) {
      case 'form':
        return <this.carbonEmbodimentResponseFormPage {...props}></this.carbonEmbodimentResponseFormPage>
      case 'success':
        return <this.queryResponseSuccess {...props}></this.queryResponseSuccess>
      case 'error':
        return <this.queryResponseError {...props}></this.queryResponseError>
    }
  }

  private carbonEmbodimentResponseFormPage = ({
    partial = undefined,
    connections = [],
    query,
    ...props
  }: CarbonEmbodimentFormProps) => {
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
              hx-post={`/queries/carbon-embodiment/${query.id}/response`}
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
              <input type="hidden" name="companyId" value={Html.escapeHtml(props.company.id)} />
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
              <FormButton name="action" value="success" text="Submit Response" style="filled" />
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

  public view = (connection: ConnectionRow, query: QueryRow): JSX.Element => {
    if (!query.response) {
      throw new Error('Cannot view query response without a response')
    }

    const subjectId = ProductAndQuantity.parse(query.details.subjectId)
    const responseData = carbonEmbodimentResponseData.parse(query.response)

    return (
      <Page
        title="Veritable - Query Response"
        activePage="queries"
        heading="View response to your query"
        headerLinks={[
          { name: 'Queries', url: '/queries' },
          { name: connection.company_name, url: `/queries/carbon-embodiment/${query.id}/view-response` },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
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
              <table id="query-response-view">
                <tr>
                  <td>Company name:</td>
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
              <table id="query-response-view">
                <tr>
                  <td>Date Certified:</td>
                  <td>
                    <time class="query-results-left-padding-table">{Html.escapeHtml(new Date(query.updated_at))}</time>
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
        </div>
      </Page>
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

  private queryResponseSuccess = (props: CarbonEmbodimentFormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <h2>Thank you for your response!</h2>
        <p>
          You have successfully forwarded the query to the following supplier(s) for their carbon contribution to the
          product/component:
        </p>
        <i>
          <p>{Html.escapeHtml(props.company.company_name)}</p>
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

  private queryResponseError = (props: CarbonEmbodimentFormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          There has been an error when responding to the query by following company:{' '}
          {Html.escapeHtml(props.company.company_name)}.
        </p>
        <p>Please try again or contact the respective company to resolve this issue.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
}
