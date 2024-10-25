import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow, QueryRow } from '../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../common.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input' | 'errored' | 'forwarded'

interface Query {
  id: string
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
  role: 'responder' | 'requester'
  quantity: string
  productId: string
  emissions: string
}

export type Scope3FormStage = 'form' | 'success' | 'error'
export interface Scope3FormProps {
  formStage: Scope3FormStage
  company: ConnectionRow
  connections?: ConnectionRow[]
  partial?: boolean
  query: QueryRow
}

@singleton()
export default class Scope3CarbonConsumptionResponseTemplates {
  constructor() {}

  public newScope3CarbonConsumptionResponseFormPage = ({
    formStage,
    company,
    query,
    partial,
    connections,
  }: Scope3FormProps) => {
    return (
      <Page
        title="Veritable - Select Company"
        activePage="queries"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          {
            name: `Query Request ${query.details.productId}`,
            url: `/queries/scope-3-carbon-consumption/${query.id}/response`,
          },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.scope3
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
  public scope3 = (props: Scope3FormProps): JSX.Element => {
    switch (props.formStage) {
      case 'form':
        return <this.scope3CarbonConsumptionResponseFormPage {...props}></this.scope3CarbonConsumptionResponseFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      case 'error':
        return <this.newQueryError {...props}></this.newQueryError>
    }
  }

  public scope3CarbonConsumptionResponseFormPage = ({
    partial = undefined,
    connections = [],
    query,
    ...props
  }: Scope3FormProps) => {
    return (
      <div class="container-scope3-carbon">
        <div class="scope3-co2-left">
          <h1 id="scope3-co2-heading">Total Carbon Embodiment</h1>
          <span>
            <p class="query-text-carbon3-consumption">
              Provide the total carbon embodiment for the specified product/component.
            </p>
            <p class="query-text-carbon3-consumption">
              If you do not have all the required information, please forward this query to your suppliers to gather
              their responses. Once you have all the necessary information, you can submit the final total.{''}
            </p>
          </span>
        </div>
        <div class="scope3-co2-right">
          <p class="query-text-carbon3-consumption">
            What is the total carbon embodiment for the product/component below?
          </p>
          <div hx-swap-oob="true" hx-swap="ignoreTitle:true" id="partial-query">
            <form
              id="scope-3-carbon-consumption"
              hx-post={`/queries/scope-3-carbon-consumption/${query.id}/response`}
              hx-select="main > *"
              hx-include={"[name='quantity'], [name='companyId'], [name='productId']"}
              hx-target="main"
              hx-swap="innerHTML"
            >
              <p>
                Product ID: {Html.escapeHtml(query.details.productId)}
                <br />
                Quantity: {Html.escapeHtml(query.details.quantity)}
              </p>
              <input type="hidden" name="companyId" value={Html.escapeHtml(props.company.id)} />
              <div class="input-container">
                <label for="co2-emissions-input" class="input-label">
                  Total carbon from my operations only (Scope 1 & 2)
                </label>
                <input
                  id="co2-emissions-input"
                  name="emissions"
                  placeholder="Value in kg CO2e (to be aggregated)"
                  class="input-with-label"
                  type="text"
                  value={Html.escapeHtml(query.details.emissions || '')}
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

  public view = (query: Query): JSX.Element => (
    <Page
      title="Veritable - Query Response"
      activePage="queries"
      heading="View response to your query"
      headerLinks={[
        { name: 'Queries', url: '/queries' },
        { name: query.company_name, url: `/queries/scope-3-carbon-consumption/${query.id}/view-response` },
      ]}
    >
      <div class="connections header"></div>
      <div class="card-body">
        <div class="container-scope3-carbon">
          <div class="scope3-co2-left">
            <h1>Total Carbon Embodiment</h1>
            <p class="query-text-carbon3-consumption">
              A query for calculating the total carbon embodiment for a given product or component.
            </p>
          </div>
          <div class="scope3-co2-right">
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
                <td class="query-results-left-padding-table">{Html.escapeHtml(query.company_name)}</td>
              </tr>
              <tr>
                <td>Product ID:</td>
                <td class="query-results-left-padding-table">{Html.escapeHtml(query.productId)}</td>
              </tr>
              <tr>
                <td>Quantity:</td>
                <td class="query-results-left-padding-table">{Html.escapeHtml(query.quantity)}</td>
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
                <td class="query-results-left-padding-table">{Html.escapeHtml(query.emissions)} kg CO2e</td>
              </tr>
            </table>
            <LinkButton text="Back to Queries" href="/queries" style="filled" />
          </div>
        </div>
      </div>
    </Page>
  )

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

  private newQuerySuccess = (props: Scope3FormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <h1>Your Query has been sent!</h1>
        <p>Your query has been successfully shared with the following supplier:</p>
        <i>
          <p>{Html.escapeHtml(props.company.company_name)}</p>
        </i>
        <p>
          Once all responses are received, the information will be automatically gathered and shared with you. No
          further action is needed on your part. You can trust that the process is secure, transparent, and streamlined
          for your convenience.
        </p>
        <p>You can check the status of your query in the Queries section of your dashboard.</p>
        <LinkButton disabled={false} text="Back to Queries" href="/queries" icon={''} style="filled" />
      </div>
    )
  }

  private newQueryError = (props: Scope3FormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          There has been an error when responding to the querry by following company:{' '}
          {Html.escapeHtml(props.company.company_name)}.
        </p>
        <p>Please try again or contact the respective company to resolve this issue.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
}
