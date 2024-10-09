import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { LinkButton, Page, statusToClass } from '../common.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input' | 'errored'
type QueryRole = 'responder' | 'requester'
type Query = {
  id: string
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
  role: QueryRole
}
@singleton()
export default class QueryListTemplates {
  constructor() {}

  private direction = (status: string | QueryStatus): JSX.Element => {
    switch (status) {
      case 'pending_your_input':
        return <p>Received</p>
      case 'pending_their_input':
        return <p>Sent</p>
      case 'resolved':
        return <p>Received</p>
      default:
        return <p>unknown</p>
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
              {['Company Name', 'Query Type', 'Direction', 'Requested deadline', 'Verification Status', 'Actions'].map(
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
                    <td>{Html.escapeHtml(query.query_type)}</td>
                    <td>{this.direction(query.status)}</td>
                    <td>
                      <time>{Html.escapeHtml(new Date(query.updated_at).toISOString())}</time>
                    </td>
                    <td>{statusToClass(query.status)}</td>

                    <td>
                      <LinkButton
                        icon='url("/public/images/dot-icon.svg")'
                        style="outlined"
                        disabled={this.isButtonDisabled(query.status, query.role)}
                        text={this.buttonText(query.status, query.role)}
                        href={
                          query.status === 'resolved' && query.role === 'requester'
                            ? `/queries/scope-3-carbon-consumption/${query.id}/view-response`
                            : `/queries/scope-3-carbon-consumption/${query.id}/response`
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
