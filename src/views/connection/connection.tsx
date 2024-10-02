import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { LinkButton, Page, statusToClass } from '../common.js'

@singleton()
export default class ConnectionTemplates {
  constructor() {}

  public listPage = (connections: ConnectionRow[], search: string = '') => {
    return (
      <Page
        title="Veritable - Connections"
        heading="Connections"
        activePage="connections"
        headerLinks={[{ name: 'Connections', url: '#' }]}
        // htmx props
        hx-get="/connection"
        hx-trigger="every 10s"
        hx-select="#search-results"
        hx-target="#search-results"
        hx-swap="outerHTML"
        hx-include="#connection-search-input"
      >
        <div class="list-page-header">
          <span>Connections Summary</span>
          <LinkButton
            disabled={false}
            text="Invite New Connection"
            href="connection/new"
            icon={'url("/public/images/plus.svg")'}
            style="filled"
          />
          <LinkButton
            disabled={false}
            text="Add from Invitation"
            href="connection/new?fromInvite=true"
            icon={'url("/public/images/plus.svg")'}
            style="filled"
          />
        </div>
        <div class="list-page">
          <div class="list-nav">
            <span>Connections</span>
            <input
              id="connection-search-input"
              class="search-window"
              type="search"
              name="search"
              value={Html.escapeHtml(search)}
              placeholder="Search"
              hx-get="/connection"
              hx-trigger="input changed delay:500ms, search"
              hx-target="#search-results"
              hx-select="#search-results"
              hx-swap="outerHTML"
            ></input>
          </div>
          <table class="list-page">
            <thead>
              {['Company Name', 'Verification Status', 'Actions'].map((name: string) => (
                <th>
                  <span>{name || 'unknown'}</span>
                  <a class="list-filter-icon disabled" />
                </th>
              ))}
            </thead>
            <tbody id="search-results">
              {connections.length == 0 ? (
                <tr>
                  <td>No Connections for that search query. Try again or add a new connection</td>
                </tr>
              ) : (
                connections.map(({ company_name, id, status, pin_tries_remaining_count }) => {
                  const isVerified = ['unverified', 'verified_them'].includes(status)
                  let disabledButton = isVerified ? false : true
                  if (pin_tries_remaining_count === 0) {
                    disabledButton = true
                  }
                  const actionHref = isVerified ? `/connection/${id}/pin-submission` : '#'
                  return (
                    <tr>
                      <td>{Html.escapeHtml(company_name)}</td>
                      <td>{statusToClass(status)}</td>
                      <td>
                        <LinkButton
                          icon='url("/public/images/arrow-right-circle.svg")'
                          style="outlined"
                          disabled={disabledButton}
                          href={actionHref}
                          text="Complete Verification"
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Page>
    )
  }
}
