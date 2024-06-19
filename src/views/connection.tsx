import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ButtonIcon, Page } from './common.js'

type ConnectionStatus = 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'

interface connection {
  company_name: string
  status: ConnectionStatus
  id: string
}

@singleton()
export default class ConnectionTemplates {
  constructor() {}

  private statusToClass = (status: string | ConnectionStatus): JSX.Element => {
    switch (status) {
      case 'pending':
        return <div class="error">'Pending Your Verification'</div>
      case 'verified_them':
      case 'verified_us':
        return (
          <div class="warning">
            {status == 'verified_them'
              ? 'Pending Your Verification'
              : status == 'verified_us'
                ? 'Pending Their Verification'
                : 'unknown'}
          </div>
        )
      case 'disconnected':
      case 'unverified':
        return <div class="disconnected">{status == 'disconnected' ? 'Disconnected' : 'Unverified'}</div>
      case 'verified_both':
        return <div class="success">Verified - Established Connection</div>
      default:
        return <div class="error">unknown</div>
    }
  }

  public listPage = (connections: connection[], search: string = '') => {
    return (
      <Page title="Veritable - Connections" heading="Connections" url="/connection">
        <div class="main connections"
          hx-get="/connection"
          hx-trigger="every 10s"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
        >
          <div class="connections header">
            <span>Connections Summary</span>
            <ButtonIcon
              disabled={false}
              name="Invite New Connection"
              href="connection/new"
              showIcon={true}
              fillButton={true}
            />
            <ButtonIcon
              disabled={false}
              name="Add from Invitation"
              href="connection/new?fromInvite=true"
              showIcon={true}
              fillButton={true}
            />
          </div>
          <div class="connections list">
            <div class="connections-list-nav">
              <span>Connections</span>
              <input
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
            <table class="connections list">
              <tr>
                {['Company Name', 'Verification Status', 'Actions'].map((name: string) => (
                  <th>
                    <span>{name || 'unknown'}</span>
                    <a class="connections-table icon disabled" />
                  </th>
                ))}
              </tr>
              <tbody id="search-results">
                {connections.length == 0 ? (
                  <tr>
                    <td>No Connections for that search query. Try again or add a new connection</td>
                  </tr>
                ) : (
                  connections.map((connection) => (
                    <tr>
                      <td>{Html.escapeHtml(connection.company_name)}</td>
                      <td>{this.statusToClass(connection.status)}</td>
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
