import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../common.js'

export type Scope3FormStage = 'companySelect' | 'form' | 'success' | 'error'
type Scope3SelectProps = {
  formStage: 'companySelect'
  connections: ConnectionRow[]
  search: string
}
type Scope3FormProps = {
  formStage: 'form'
  connectionId: string
  productId?: string
  quantity?: number
}
type Scope3SuccessProps = {
  formStage: 'success'
  company: { companyNumber: string; companyName?: string }
}
type Scope3ErrorProps = {
  formStage: 'error'
  company: { companyNumber: string; companyName?: string }
}

type Scope3QueryProps = Scope3SelectProps | Scope3FormProps | Scope3SuccessProps | Scope3ErrorProps

@singleton()
export default class Scope3CarbonConsumptionTemplates {
  constructor() {}

  public newScope3CarbonConsumptionFormPage = (props: Scope3QueryProps) => {
    return (
      <Page
        title="Veritable - New Scope 3 Carbon Consumption Query"
        activePage="categories"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          { name: 'New', url: '/queries/new' },
          { name: 'Scope 3 Carbon Consumption', url: '/queries/new/scope-3-carbon-consumption' },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.newScope3 {...props} />
        </div>
      </Page>
    )
  }
  private newScope3 = (props: Scope3QueryProps): JSX.Element => {
    switch (props.formStage) {
      case 'companySelect':
        return <this.listPage {...props}></this.listPage>
      case 'form':
        return <this.scope3CarbonConsumptionFormPage {...props}></this.scope3CarbonConsumptionFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      case 'error':
        return <this.newQueryError {...props}></this.newQueryError>
    }
  }

  private listPage = (props: Scope3SelectProps) => {
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
                            name="connectionId"
                            value={connection.id}
                            disabled={connection.status !== 'verified_both'}
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

  private scope3CarbonConsumptionFormPage = (props: Scope3FormProps) => {
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
              <input type="hidden" name="connectionId" value={props.connectionId} />
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

  private newQuerySuccess = (props: Scope3SuccessProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          Your query request has been shared with the following supplier: {Html.escapeHtml(props.company.companyName)}.
        </p>
        <p>Please await for responses and check for updates in the query management page.</p>
        <LinkButton disabled={false} text="Back to Queries" href="/queries" icon={''} style="filled" />
      </div>
    )
  }

  private newQueryError = (props: Scope3ErrorProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>An unknown error occurred whilst submitting your query to: {Html.escapeHtml(props.company.companyName)}.</p>
        <p>Please try again later.</p>
        <LinkButton disabled={false} text="Back to Queries" href="/queries" icon={''} style="filled" />
      </div>
    )
  }
}
