import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { UUID } from '../../models/strings.js'
import { LinkButton, Page } from '../common.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input' | 'errored'

interface Query {
  id: UUID
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}
@singleton()
export default class QueryListTemplates {
  constructor() {}

  private statusToClass = (status: string | QueryStatus): JSX.Element => {
    switch (status) {
      case 'pending_your_input':
        return (
          <div class="list-item-status" data-status="warning">
            Pending Your Input
          </div>
        )
      case 'pending_their_input':
        return (
          <div class="list-item-status" data-status="disabled">
            Pending Their Input
          </div>
        )
      case 'resolved':
        return (
          <div class="list-item-status" data-status="success">
            Resolved
          </div>
        )
      case 'errored':
        return (
          <div class="list-item-status" data-status="error">
            Errored
          </div>
        )
      default:
        return (
          <div class="list-item-status" data-status="error">
            unknown
          </div>
        )
    }
  }

  private direction = (status: string | QueryStatus): JSX.Element => {
    switch (status) {
      case 'pending_your_input':
        return <p>Received</p>
      case 'pending_their_input':
        return <p>Sent</p>
      case 'resolved':
        return <p>Received</p>
      default:
        return <p>not sure</p>
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
                    <span>{name || 'unknown'}</span>
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
                    <td>{this.statusToClass(query.status)}</td>

                    <td>
                      <LinkButton
                        icon='url("/public/images/dot-icon.svg")'
                        style="outlined"
                        disabled={false}
                        text="some action"
                        href={`/queries/scope-3-carbon-consumption/${query.id}/response`}
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
