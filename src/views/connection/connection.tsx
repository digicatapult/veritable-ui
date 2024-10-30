import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { LinkButton, Page, statusToClass } from '../common.js'

const statusToAction = (
  status: ConnectionRow['status'],
  connectionId: string,
  pinTriesRemaining: number | null
): { disabled: boolean; href: string; text: string } => {
  switch (status) {
    case 'pending':
    case 'verified_us':
      return {
        disabled: true,
        href: '#',
        text: 'Waiting for Response',
      }
    case 'unverified':
    case 'verified_them':
      if (pinTriesRemaining === null || pinTriesRemaining > 0) {
        return {
          disabled: false,
          href: `/connection/${connectionId}/pin-submission`,
          text: 'Complete Verification',
        }
      }
      return {
        disabled: true,
        href: '#',
        text: 'Pin Attempts Exhausted',
      }
    case 'disconnected':
      return {
        disabled: true,
        href: '#',
        text: 'Disconnected',
      }
    case 'verified_both':
      return {
        disabled: false,
        href: `/queries/new/scope-3-carbon-consumption?connectionId=${connectionId}`,
        text: 'Send Query',
      }
  }
}

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
              placeholder="Search by Company Name"
              hx-get="/connection"
              hx-trigger="input changed delay:500ms, search"
              hx-target="#search-results"
              hx-select="#search-results"
              hx-swap="outerHTML"
            ></input>
          </div>
          <table class="list-page">
            <thead>
              {['Company Name', 'Status', 'Actions'].map((name: string) => (
                <th>
                  <span>{Html.escapeHtml(name)}</span>
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
                connections.map(this.connectionRow)
              )}
            </tbody>
          </table>
        </div>
      </Page>
    )
  }

  private connectionRow = ({ company_name, id, status, pin_tries_remaining_count }: ConnectionRow) => {
    return (
      <tr>
        <td>{Html.escapeHtml(company_name)}</td>
        <td>{statusToClass(status)}</td>
        <td>
          <LinkButton
            icon='url("/public/images/arrow-right-circle.svg")'
            style="outlined"
            {...statusToAction(status, id, pin_tries_remaining_count)}
          />
        </td>
      </tr>
    )
  }
}
