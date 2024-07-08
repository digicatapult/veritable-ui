import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ButtonIcon, Page } from './common.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
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
        return <div class="warning">Pending Your Input</div>
      case 'pending_their_input':
        return <div class="disconnected">Pending Their Input</div>
      case 'resolved':
        return <div class="success">Resolved</div>
      default:
        return <div class="error">unknown</div>
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
        activePage="categories"
        headerLinks={[{ name: 'Query Management', url: '/queries' }]}
      >
        <div
          class="main-list-page"
          hx-get="/queries"
          hx-trigger="every 10s"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
          hx-include="#queries-search-input"
        >
          <div class="list-page-header">
            <span>Query Management</span>
            <ButtonIcon disabled={false} name="Query Request" href="/queries/new" showIcon={true} fillButton={true} />
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
                {[
                  'Company Name',
                  'Query Type',
                  'Direction',
                  'Requested deadline',
                  'Verification Status',
                  'Actions',
                ].map((name: string) => (
                  <th>
                    <span>{name || 'unknown'}</span>
                    <a class="list-table icon disabled" />
                  </th>
                ))}
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
                        <ButtonIcon
                          icon='url("/public/images/dot-icon.svg")'
                          outline={true}
                          disabled={true}
                          name="some action"
                          showIcon={true}
                          fillButton={true}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Page>
    )
  }
}
