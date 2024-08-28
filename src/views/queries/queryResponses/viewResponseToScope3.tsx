import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { UUID } from '../../../models/strings.js'
import { LinkButton, Page } from '../../common.js'
type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input' | 'errored'

interface Query {
  id: UUID
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
  role: 'responder' | 'requester'
  quantity: string
  productId: string
  emissions: string
}
@singleton()
export default class Scope3CarbonConsumptionViewResponseTemplates {
  //should be renamed to something more readable?
  constructor() {}
  public scope3CarbonConsumptionViewResponsePage = (query: Query) => {
    return (
      <Page
        title="Veritable - Query Response"
        activePage="queries"
        heading="View response to your query"
        headerLinks={[
          { name: 'Queries', url: '/queries' },
          { name: 'Query Request-someIdentifier', url: '/queries/query-response' },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          {' '}
          <div class="container-scope3-carbon">
            <div class="box1">
              <h1>Scope 3 Carbon Consumption</h1>
              <p class="query-text-carbon3-consumption">
                A query for calculationg the total scope 3 carbon consumption for a given product or component.
              </p>
            </div>
            <div class="box2">
              <h2>Query Information</h2>
              <div class="box3 ">
                <table>
                  <tr>
                    <td>Supplier:</td>
                    <td class="query-results-left-padding-table">{Html.escapeHtml(query.company_name)}</td>
                  </tr>
                  <tr>
                    <td>ProductID:</td>
                    <td class="query-results-left-padding-table">{Html.escapeHtml(query.productId)}</td>
                  </tr>
                  <tr>
                    <td>Quantity:</td>
                    <td class="query-results-left-padding-table">{Html.escapeHtml(query.quantity)}</td>
                  </tr>
                  <tr>
                    <td>Query:</td>
                    <td class="query-results-left-padding-table">
                      Please provide details on the Scope 3 carbon emissions associated with the product.
                    </td>
                  </tr>
                </table>
              </div>
              <h2>Response Information</h2>
              <div class="box3 ">
                <div class="max-height-table">
                  <table>
                    <tr>
                      <td>Date Certified:</td>
                      <td class="query-results-left-padding-table">{Html.escapeHtml(query.updated_at)}</td>
                    </tr>
                    <tr>
                      <td>Carbon Emissions:</td>
                      <td class="query-results-left-padding-table">{Html.escapeHtml(query.emissions)}</td>
                    </tr>
                  </table>
                </div>
              </div>
              <LinkButton text="Back to Queries" href="/queries" style="filled" />
            </div>
          </div>
        </div>
      </Page>
    )
  }
}
