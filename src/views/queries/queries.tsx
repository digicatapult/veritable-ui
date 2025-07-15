import { singleton } from 'tsyringe'
import { Page } from '../common.js'

@singleton()
export default class QueriesTemplates {
  constructor() {}
  public chooseQueryPage = (connectionId?: string) => {
    const connectionQuery = connectionId ? `?connectionId=${connectionId}` : ''
    return (
      <Page
        title="Veritable - Queries"
        heading="Queries"
        activePage="queries"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          { name: 'New', url: '/queries/new' },
        ]}
        stylesheets={['query.css']}
      >
        <div class="main-list-page" hx-get="/queries/new"></div>
        <div>
          <h1 class="query-page-header">Queries</h1>
          <hr class="divider"></hr>
        </div>
        <div class="query-container">
          <a class="query-item" href={`/queries/new/carbon-embodiment${connectionQuery}`}>
            <h1 class="query-header">Total Carbon Embodiment</h1>
            <p class="query-text">
              Creates a query for calculating the total carbon embodiment for a given product or component.
            </p>
          </a>
          <a class="query-item" href={`/queries/new/bav${connectionQuery}`}>
            <h1 class="query-header">Beneficiary Account Validation</h1>
            <p class="query-text">Creates a query to verify a company's financial details</p>
          </a>
          <a class="query-item disabled" href="#">
            <h1 class="query-header">Product Provenance</h1>
            <p class="query-text">
              Creates a query to assert that a product and its components are not coming from blacklisted areas.
            </p>
          </a>
          <a class="query-item disabled" href="#">
            <h1 class="query-header">Aerospace Grade</h1>
            <p class="query-text">
              Creates a query to certify all components of a product are manufactured according to aerospace grade
              standards such as AS9100.
            </p>
          </a>
          <a class="query-item disabled" href="#">
            <h1 class="query-header">ISO 9001 Compliance</h1>
            <p class="query-text">
              Creates a query to verify that all the companies involved in manufacturing a given product are ISO9001
              certified.
            </p>
          </a>
        </div>
      </Page>
    )
  }
}
