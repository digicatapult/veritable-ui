import Html from '@kitajs/html'
import { UUID } from 'crypto'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../common.js'

export type Scope3FormStage = 'companySelect' | 'form' | 'success'
interface Scope3FormProps {
  formStage: Scope3FormStage
  company: { companyNumber: string; companyName?: string }
  connection_id?: string | UUID
  productId?: string
  quantity?: number
  connections: ConnectionRow[]
  search: string
}

@singleton()
export default class Scope3CarbonConsumptionTemplates {
  constructor() {}

  public newScope3CarbonConsumptionFormPage = (
    formStage: Scope3FormStage,
    connections: ConnectionRow[],
    search: string = '',
    company: { companyName: string; companyNumber: string }
  ) => {
    return (
      <Page
        title="Veritable - Select Company"
        activePage="categories"
        heading="Select Company To Send Your Query To"
        headerLinks={[{ name: 'Select Company', url: '/queries/new/scope-3-carbon-consumption' }]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.newScope3 formStage={formStage} connections={connections} search={search} company={company} />
        </div>
      </Page>
    )
  }
  public newScope3 = (props: Scope3FormProps): JSX.Element => {
    switch (props.formStage) {
      case 'companySelect':
        return <this.listPage {...props}></this.listPage>
      case 'form':
        return <this.scope3CarbonConsumptionFormPage {...props}></this.scope3CarbonConsumptionFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      default:
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
    }
  }

  public listPage = (props: Scope3FormProps) => {
    return (
      <div>
        <div
          class="main-list-page"
          hx-post="/queries/new/scope-3-carbon-consumption"
          hx-trigger="input changed delay:500ms"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
          hx-include="#queries-search-input"
        >
          <div class="list-page ">
            <div class="list-nav">
              <span>Select a Company to send Query to </span>
              <input
                id="queries-search-input"
                class="search-window"
                type="search"
                name="search"
                value={Html.escapeHtml(props.search)}
                placeholder="Search"
                hx-get="/queries/new/scope-3-carbon-consumption"
                hx-trigger="input changed delay:50ms, search"
                hx-target="#search-results"
                hx-select="#search-results"
                hx-swap="outerHTML"
              ></input>
            </div>
            <form
              id="company-form"
              hx-post="/queries/new/scope-3-carbon-consumption/stage"
              hx-trigger="submit"
              hx-include=".company-checkbox:checked"
              hx-select="main > *"
              hx-target="main"
              hx-swap="innerHTML"
            >
              <input type="hidden" name="action" value="form" />

              <table class="list-page">
                <thead>
                  {['Check Company', 'Company Name'].map((name: string) => (
                    <th>
                      <span>{name || 'unknown'}</span>
                      <a class="list-table icon disabled" />
                    </th>
                  ))}
                </thead>
                <tbody id="search-results">
                  {props.connections.length == 0 ? (
                    <tr>
                      <td>No connections for that search. Please establish a connection and try again.</td>
                    </tr>
                  ) : (
                    props.connections.map((connection) => (
                      <tr>
                        <td>
                          <input
                            type="checkbox"
                            class="company-checkbox"
                            name="companyNumber"
                            value={connection.company_number}
                          ></input>
                        </td>
                        <td>{Html.escapeHtml(connection.company_name)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <button type="submit" class="button" id="company-selected-next-button">
                Next
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  public scope3CarbonConsumptionFormPage = (props: Scope3FormProps) => {
    return (
      <div>
        <div class="container-scope3-carbon">
          <div class="box1">
            <h1>Scope 3 Carbon Consumption</h1>
            <p class="query-text-carbon3-consumption">
              Creates a query for calculating the total scope 3 carbon consumption for a given product or component.
            </p>
          </div>
          <div class="box2">
            <p>
              Choose the product that you want to apply the query “What is your scope 1, 2, 3 carbon consumption?” to.
            </p>
            <form
              id="scope-3-carbon-consumption"
              hx-post={`/queries/new/scope-3-carbon-consumption/stage`}
              hx-select="main > *"
              hx-target="main"
              hx-swap="innerHTML"
            >
              <input type="hidden" name="companyNumber" value={props.company.companyNumber} />
              <div class="input-container">
                <label for="productId-input" class="input-label">
                  Product ID
                </label>

                <input
                  id="productId-input"
                  name="productId"
                  placeholder="BX20001"
                  class="query-input-field"
                  type="text"
                  required
                  value={props.productId}
                ></input>
                <p class="additional-input-label">Product ID</p>
              </div>
              <div class="input-container">
                <label for="productQuantity-input" class="input-label">
                  Quantity
                </label>
                <input
                  id="productQuantity-input"
                  name="quantity"
                  type="text"
                  placeholder="123"
                  pattern="^\d+$"
                  required
                  value={props.quantity?.toString()}
                  class="query-input-field"
                ></input>
                <p class="additional-input-label">Quantity of product</p>
              </div>
              <FormButton name="action" value="success" text="Submit Query" style="filled" />
            </form>
          </div>
        </div>
      </div>
    )
  }
  private newQuerySuccess = (props: Scope3FormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          Your query request has been shared with the following supplier: {Html.escapeHtml(props.company.companyName)}.
        </p>
        <p>Please await for responses and check for updates in the query management page.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
}
