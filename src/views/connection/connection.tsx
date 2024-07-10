import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { ButtonIcon, Page } from '../common.js'

type ConnectionStatus = 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'

interface connection {
  company_name: string
  status: ConnectionStatus
  id?: string
}

@singleton()
export default class ConnectionTemplates {
  constructor() {}

  private statusToClass = (status: string | ConnectionStatus): JSX.Element => {
    switch (status) {
      case 'pending':
        return <div class="error">Pending</div>
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

  public listPage = (connections: ConnectionRow[] | connection[], search: string = '') => {
    return (
      <Page
        title="Veritable - Connections"
        heading="Connections"
        activePage="connections"
        headerLinks={[{ name: 'Connections', url: '#' }]}
      >
        <div
          class="main-list-page"
          hx-get="/connection"
          hx-trigger="every 10s"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
          hx-include="#connection-search-input"
        >
          <div class="list-page-header">
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
                    <a class="list-table icon disabled" />
                  </th>
                ))}
              </thead>
              <tbody id="search-results">
                {connections.length == 0 ? (
                  <tr>
                    <td>No Connections for that search query. Try again or add a new connection</td>
                  </tr>
                ) : (
                  connections.map(({ company_name, id, status }) => {
                    const isVerified = ['unverified', 'verified_them'].includes(status)
                    const actionHref = isVerified ? `/connection/${id}/pin-submission` : '#'
                    return (
                      <tr>
                        <td>{Html.escapeHtml(company_name)}</td>
                        <td>{this.statusToClass(status)}</td>
                        <td>
                          <ButtonIcon
                            icon='url("/public/images/arrow-right-circle.svg")'
                            outline={true}
                            disabled={isVerified ? false : true}
                            href={actionHref}
                            name="Complete Verification"
                            showIcon={true}
                            fillButton={true}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Page>
    )
  }
}
