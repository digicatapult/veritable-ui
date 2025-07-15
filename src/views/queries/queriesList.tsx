import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { QueryRow } from '../../models/db/types.js'
import { LinkButton, Page, queryStatusToClass } from '../common.js'

type QueryStatus = QueryRow['status']
type QueryRole = QueryRow['role']

type Query = {
  company_name: string
} & Pick<QueryRow, 'type' | 'status' | 'updated_at' | 'role' | 'id'>

function mapQueryType(query: Query) {
  switch (query.type) {
    case 'total_carbon_embodiment':
      return 'Total Carbon Embodiment'
    case 'beneficiary_account_validation':
      return 'Beneficiary Account Validation'
  }
}

@singleton()
export default class QueryListTemplates {
  constructor() {}

  private direction = (role: QueryRole): JSX.Element => {
    switch (role) {
      case 'responder':
        return <p>Received</p>
      case 'requester':
        return <p>Sent</p>
    }
  }
  private buttonText = (status: string | QueryStatus, role: QueryRole) => {
    if (status === 'resolved' && role === 'requester') {
      return 'View Response'
    } else if (status === 'pending_their_input' && role === 'requester') {
      return 'Awaiting Response'
    } else if (status === 'pending_your_input' && role === 'responder') {
      return 'Respond to query'
    } else if (status === 'resolved' && role === 'responder') {
      return 'no action required'
    }
    return 'no action available'
  }

  private isButtonDisabled = (status: string | QueryStatus, role: QueryRole) => {
    if (status === 'resolved' && role === 'responder') {
      return true
    } else if (status === 'pending_their_input') {
      return true
    } else if (status === 'errored') {
      return true
    } else if (status === 'forwarded') {
      return true
    }
  }

  public listPage = (queries: Query[], search: string = '') => {
    return (
      <Page
        title="Veritable - Queries"
        heading="Query Management"
        activePage="queries"
        headerLinks={[{ name: 'Query Management', url: '/queries' }]}
        stylesheets={['query.css']}
        hx-get="/queries"
        hx-trigger="every 10s"
        hx-select="#search-results"
        hx-target="#search-results"
        hx-swap="outerHTML"
        hx-include="#queries-search-input"
      >
        <div class="list-page-header">
          <span>Query Management</span>
          <LinkButton
            disabled={false}
            text="Query Request"
            href="/queries/new"
            icon={'url("/public/images/plus.svg")'}
            style="filled"
          />
        </div>
        <div class="list-page ">
          <div class="list-nav">
            <span>Query Management</span>
            <input
              id="queries-search-input"
              class="search-window"
              type="search"
              name="search"
              value={Html.escapeHtml(search)}
              placeholder="Search"
              hx-get="/queries"
              hx-trigger="input changed delay:500ms, search"
              hx-target="#search-results"
              hx-select="#search-results"
              hx-swap="outerHTML"
            ></input>
          </div>
          <table class="list-page">
            <thead>
              {['Company Name', 'Query Type', 'Direction', 'Requested deadline', 'Status', 'Actions'].map(
                (name: string) => (
                  <th>
                    <span>{Html.escapeHtml(name || 'unknown')}</span>
                    <a class="list-filter-icon icon disabled" />
                  </th>
                )
              )}
            </thead>
            <tbody id="search-results">
              {queries.length == 0 ? (
                <tr>
                  <td>No Queries for that search. Try again or add a new query</td>
                </tr>
              ) : (
                queries.map((query) => (
                  <tr>
                    <td>{Html.escapeHtml(query.company_name)}</td>
                    <td>{Html.escapeHtml(mapQueryType(query))}</td>
                    <td>{this.direction(query.role)}</td>
                    <td>
                      <time>{Html.escapeHtml(new Date(query.updated_at).toISOString())}</time>
                    </td>
                    <td>{queryStatusToClass(query.status)}</td>

                    <td>
                      <LinkButton
                        icon='url("/public/images/dot-icon.svg")'
                        style="outlined"
                        disabled={
                          this.isButtonDisabled(query.status, query.role) ||
                          query.type === 'beneficiary_account_validation' // TODO implement BAV responses
                        }
                        text={this.buttonText(query.status, query.role)}
                        href={
                          query.status === 'resolved' && query.role === 'requester'
                            ? `/queries/carbon-embodiment/${query.id}/view-response`
                            : `/queries/carbon-embodiment/${query.id}/response`
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Page>
    )
  }
}
