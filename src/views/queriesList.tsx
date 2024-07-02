import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ButtonIcon, Page } from './common.js'

type QueryStatus = 'Resolved' | 'Pending Your Input' | 'Pending Their Input'

interface query {
  company_name: string
  query_type: string
  direction: 'Sent' | 'Received'
  updated_at: Date
  status: QueryStatus
}
@singleton()
export default class QueryListTemplates {
  constructor() {}

  private statusToClass = (status: string | QueryStatus): JSX.Element => {
    switch (status) {
      case 'Pending Your Input':
        return <div class="warning">Pending Your Input</div>
      case 'Pending Their Input':
        return <div class="disconnected">Pending Their Input</div>
      case 'Resolved':
        return <div class="success">Resolved</div>
      default:
        return <div class="error">unknown</div>
    }
  }

  public listPage = (queries: query[], search: string = '') => {
    return (
      <Page
        title="Veritable - Queries"
        heading="Query Management"
        headerLinks={[{ name: 'Query Management', url: '/query-management' }]}
      >
        <div
          class="main connections"
          hx-get="/query-management"
          hx-trigger="every 10s"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
          hx-include="#connection-search-input"
        >
          <div class="connections header">
            <span>Query Management</span>
            <ButtonIcon
              disabled={false}
              name="Query Request"
              href="/query-management/queries"
              showIcon={true}
              fillButton={true}
            />
          </div>
          <div class="connections list">
            <div class="connections-list-nav">
              <span>Query Management</span>
              <input
                id="connection-search-input"
                class="search-window"
                type="search"
                name="search"
                value={Html.escapeHtml(search)}
                placeholder="Search"
                hx-get="/query-management"
                hx-trigger="input changed delay:500ms, search"
                hx-target="#search-results"
                hx-select="#search-results"
                hx-swap="outerHTML"
              ></input>
            </div>
            <table class="connections list">
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
                    <a class="connections-table icon disabled" />
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
                      <td>{Html.escapeHtml(query.direction)}</td>
                      <td>{Html.escapeHtml(query.updated_at)}</td>
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
