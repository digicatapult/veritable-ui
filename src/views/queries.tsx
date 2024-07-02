import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from './common.js'

@singleton()
export default class QueriesTemplates {
  constructor() {}
  public chooseQueryPage = () => {
    return (
      <Page
        title="Veritable - Queries"
        heading="Queries"
        headerLinks={[
          { name: 'Query Management', url: '/query-management' },
          { name: 'Queries', url: '/query-management/queries' },
        ]}
        stylesheets={['new-invite.css']}
      >
        <div class="main connections" hx-get="/query-management/queries"></div>
        <div>
          <h1 class="query-page-header">Queries</h1>
          <hr class="divider"></hr>
        </div>
        <div class="query-container">
          <a class="query-item" onclick="location.href='#';">
            <h1 class="query-header">Scope 3 Carbon Consumption</h1>
            <p class="query-text">
              Creates a query for calculating the total scope 3 carbon consumption for a given product or component.
            </p>
          </a>
          <a class="query-item" onclick="location.href='#';">
            <h1 class="query-header">Product Provenance</h1>
            <p class="query-text">
              Creates a query to assert that a product and its components are not coming from blacklisted areas.
            </p>
          </a>
          <a class="query-item" onclick="location.href='#';">
            <h1 class="query-header">Aerospace Grade</h1>
            <p class="query-text">
              Creates a query to certify all components of a product are manufactured according to aerospace grade
              standards such as AS9100.
            </p>
          </a>
          <a class="query-item" onclick="location.href='#';">
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
