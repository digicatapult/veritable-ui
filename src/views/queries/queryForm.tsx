import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow, QueryType } from '../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../common.js'

const typeMap: Record<QueryType, { name: string; urlSegment: string }> = {
  total_carbon_embodiment: {
    name: 'Total Carbon Embodiment',
    urlSegment: 'carbon-embodiment',
  },
  beneficiary_account_validation: {
    name: 'Beneficiary Account Validation',
    urlSegment: 'bav',
  },
}

export type FormStage = 'companySelect' | 'carbonEmbodiment' | 'bav' | 'success' | 'error'
type SelectProps = {
  formStage: 'companySelect'
  type: QueryType
  connections: ConnectionRow[]
  search: string
}
type CarbonEmbodimentFormProps = {
  formStage: 'carbonEmbodiment'
  type: QueryType
  connectionId: string
  productId?: string
  quantity?: number
}
type BavFormProps = {
  formStage: 'bav'
  type: QueryType
  connection: ConnectionRow
}
type SuccessProps = {
  formStage: 'success'
  type: QueryType
  company: { companyName?: string }
}
type ErrorProps = {
  formStage: 'error'
  type: QueryType
  company: { companyName?: string }
}

type QueryProps = SelectProps | CarbonEmbodimentFormProps | BavFormProps | SuccessProps | ErrorProps

@singleton()
export default class QueryFormTemplates {
  constructor() {}

  public newQueryFormPage = (props: QueryProps) => {
    return (
      <Page
        title={`Veritable - New ${typeMap[props.type].name} Query`}
        activePage="queries"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          { name: 'New', url: '/queries/new' },
          { name: typeMap[props.type].name, url: `/queries/new/${typeMap[props.type].urlSegment}` },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.newQueryForm {...props} />
        </div>
      </Page>
    )
  }
  private newQueryForm = (props: QueryProps): JSX.Element => {
    switch (props.formStage) {
      case 'companySelect':
        return <this.listPage {...props}></this.listPage>
      case 'carbonEmbodiment':
        return <this.carbonEmbodimentFormPage {...props}></this.carbonEmbodimentFormPage>
      case 'bav':
        return <this.bavFormPage {...props}></this.bavFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      case 'error':
        return <this.newQueryError {...props}></this.newQueryError>
    }
  }

  private listPage = (props: SelectProps) => {
    return (
      <div>
        <div class="main-list-page">
          <div class="list-page ">
            <div class="list-nav">
              <span>Select a Company to send Query to</span>
              <input
                id="queries-search-input"
                class="search-window"
                type="search"
                name="search"
                value={Html.escapeHtml(props.search)}
                placeholder="Search"
                hx-get={`/queries/new/${typeMap[props.type].urlSegment}`}
                hx-trigger="input changed delay:50ms, search"
                hx-target="#search-results"
                hx-select="#search-results"
                hx-swap="outerHTML"
              ></input>
            </div>
            <form
              id="company-form"
              hx-get={`/queries/new/${typeMap[props.type].urlSegment}`}
              hx-select="main > *"
              hx-target="main"
              hx-swap="innerHTML"
              hx-push-url="true"
            >
              <table class="list-page">
                <thead>
                  {['Select', 'Company Name'].map((name: string) => (
                    <th width={name === 'Select' ? '4%' : '96%'}>
                      <span>{Html.escapeHtml(name || 'unknown')}</span>
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
                            aria-label="select connection id"
                          />
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

  private carbonEmbodimentFormPage = (props: CarbonEmbodimentFormProps) => {
    return (
      <div>
        <div class="container-query-form">
          <div class="query-form-left">
            <h1>Total Carbon Embodiment</h1>
            <p class="query-form-text">
              Creates a query for obtaining the total carbon embodiment for a given product/component.
            </p>
          </div>
          <div class="query-form-right">
            <p>
              Choose the product that you want to apply the query “What is the total carbon embodiment for the
              product/component below?” to.
            </p>
            <form
              id="carbon-embodiment"
              hx-post="/queries/new/carbon-embodiment"
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
                  class="input-with-label"
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
                  value={props?.quantity?.toString()}
                  class="input-with-label"
                ></input>
                <p class="additional-input-label">Quantity of product</p>
              </div>
              <FormButton text="Submit Query" style="filled" />
            </form>
          </div>
        </div>
      </div>
    )
  }

  private bavFormPage = (props: BavFormProps) => {
    return (
      <div class="container-query-form">
        <div class="query-form-left">
          <h1>Beneficiary Account Validation</h1>
          <p class="query-form-text">Creates a query to verify a company's financial details.</p>
        </div>
        <div class="query-form-right">
          <p>Request financial details from {Html.escapeHtml(props.connection.company_name)}</p>
          <form id="bav" hx-post="/queries/new/bav" hx-select="main > *" hx-target="main" hx-swap="innerHTML">
            <input type="hidden" name="connectionId" value={props.connection.id} />
            <FormButton text="Submit Query" style="filled" />
          </form>
        </div>
      </div>
    )
  }

  private newQuerySuccess = (props: SuccessProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <h1>Your Query has been sent!</h1>
        <p>Your query has been successfully shared with the following supplier:</p>
        <i>
          <p>{Html.escapeHtml(props.company.companyName)}</p>
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

  private newQueryError = (props: ErrorProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>An unknown error occurred whilst submitting your query to: {Html.escapeHtml(props.company.companyName)}.</p>
        <p>Please try again later.</p>
        <LinkButton disabled={false} text="Back to Queries" href="/queries" icon={''} style="filled" />
      </div>
    )
  }
}
