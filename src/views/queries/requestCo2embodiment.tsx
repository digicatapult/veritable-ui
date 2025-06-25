import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../common.js'

export type CarbonEmbodimentFormStage = 'companySelect' | 'form' | 'success' | 'error'
type CarbonEmbodimentSelectProps = {
  formStage: 'companySelect'
  connections: ConnectionRow[]
  search: string
}
type CarbonEmbodimentFormProps = {
  formStage: 'form'
  connectionId: string
  productId?: string
  quantity?: number
}
type CarbonEmbodimentSuccessProps = {
  formStage: 'success'
  company: { companyName?: string }
}
type CarbonEmbodimentErrorProps = {
  formStage: 'error'
  company: { companyNumber: string; companyName?: string }
}

type CarbonEmbodimentQueryProps =
  | CarbonEmbodimentSelectProps
  | CarbonEmbodimentFormProps
  | CarbonEmbodimentSuccessProps
  | CarbonEmbodimentErrorProps

@singleton()
export default class CarbonEmbodimentTemplates {
  constructor() {}

  public newCarbonEmbodimentFormPage = (props: CarbonEmbodimentQueryProps) => {
    return (
      <Page
        title="Veritable - New Total Carbon Embodiment Query"
        activePage="queries"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          { name: 'New', url: '/queries/new' },
          { name: 'Total Carbon Embodiment', url: '/queries/new/carbon-embodiment' },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.newCarbonEmbodiment {...props} />
        </div>
      </Page>
    )
  }
  private newCarbonEmbodiment = (props: CarbonEmbodimentQueryProps): JSX.Element => {
    switch (props.formStage) {
      case 'companySelect':
        return <this.listPage {...props}></this.listPage>
      case 'form':
        return <this.carbonEmbodimentFormPage {...props}></this.carbonEmbodimentFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      case 'error':
        return <this.newQueryError {...props}></this.newQueryError>
    }
  }

  private listPage = (props: CarbonEmbodimentSelectProps) => {
    return (
      <div>
        <div
          class="main-list-page"
          hx-post="/queries/new/carbon-embodiment"
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
                hx-get="/queries/new/carbon-embodiment"
                hx-trigger="input changed delay:50ms, search"
                hx-target="#search-results"
                hx-select="#search-results"
                hx-swap="outerHTML"
              ></input>
            </div>
            <form
              id="company-form"
              hx-get="/queries/new/carbon-embodiment"
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
        <div class="container-carbon-embodiment">
          <div class="co2-embodiment-left">
            <h1>Total Carbon Embodiment</h1>
            <p class="query-text-carbon-embodiment">
              Creates a query for obtaining the total carbon embodiment for a given product/component.
            </p>
          </div>
          <div class="co2-embodiment-right">
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

  private newQuerySuccess = (props: CarbonEmbodimentSuccessProps): JSX.Element => {
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

  private newQueryError = (props: CarbonEmbodimentErrorProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>An unknown error occurred whilst submitting your query to: {Html.escapeHtml(props.company.companyName)}.</p>
        <p>Please try again later.</p>
        <LinkButton disabled={false} text="Back to Queries" href="/queries" icon={''} style="filled" />
      </div>
    )
  }
}
