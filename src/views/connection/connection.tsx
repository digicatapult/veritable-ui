import Html from '@kitajs/html'
import { injectable, singleton } from 'tsyringe'
import { ConnectionRow } from '../../models/db/types.js'
import { BavResFields } from '../../models/drpc.js'
import { connectionStatusToClass, LinkButton, Page } from '../common.js'

const statusToAction = (
  status: ConnectionRow['status'],
  connectionId: string,
  pinTriesRemaining: number | null
): { disabled: boolean; href: string; text: string } => {
  switch (status) {
    case 'pending':
    case 'verified_us':
    case 'disconnected':
    case 'verified_both':
      return {
        disabled: false,
        href: `/connection/profile/${connectionId}`,
        text: 'View Connection',
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
        disabled: false,
        href: `/connection/profile/${connectionId}`,
        text: 'Pin Attempts Exhausted',
      }
  }
}
const statusToString = (status: ConnectionRow['status']) => {
  switch (status) {
    case 'pending':
    case 'verified_us':
    case 'unverified':
    case 'verified_them':
      return 'Unverified'
    case 'verified_both':
      return 'Verified'
    case 'disconnected':
      return 'Disconnected'
  }
}

@singleton()
@injectable()
export default class ConnectionTemplates {
  constructor() {}

  public listPage = (connections: ConnectionRow[], search: string = '') => {
    return (
      <Page
        title="Veritable - Connections"
        heading="Connections"
        activePage="connections"
        headerLinks={[{ name: 'Connection Management', url: '#' }]}
        // htmx props
        hx-get="/connection"
        hx-trigger="every 10s"
        hx-select="#search-results"
        hx-target="#search-results"
        hx-swap="outerHTML"
        hx-include="#connection-search-input"
      >
        <div class="list-page-header">
          <span>Connection Management</span>
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
              {['Company Number', 'Company Name', 'Country Code', 'Status', 'Actions'].map((name: string) => (
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

  public profilePage = (connection: ConnectionRow, bankDetails?: BavResFields) => {
    return (
      <Page
        title="Veritable - Connection Profile"
        heading="Connection Profile"
        activePage="connections"
        headerLinks={[{ name: 'Connection Management', url: '#' }]}
        stylesheets={['profile.css']}
      >
        <div class="card-body">
          <div class="container-profile-form">
            <div class="profile-form-left">
              <h1>{Html.escapeHtml(connection.company_name)}</h1>
              <div id="profile-form-left-info">
                <p>
                  Country: <b>{Html.escapeHtml(connection.registry_country_code)}</b>
                </p>
                <p>
                  Address: <b>{Html.escapeHtml(connection.address)}</b>
                </p>
                <p>
                  Company Number: <b>{Html.escapeHtml(connection.company_number)}</b>
                </p>
              </div>

              <p>
                Joined Veritable: <b>{Html.escapeHtml(connection.created_at.toLocaleDateString())}</b>
              </p>
            </div>
            <div class="profile-form-right">
              <div>
                <h3>Connection: </h3>
                <b
                  class="connection-status"
                  data-status={statusToString(connection.status) == 'Verified' ? 'success' : 'disabled'}
                >
                  {statusToString(connection.status)}
                </b>
                {Html.escapeHtml(connection.updated_at.toLocaleDateString())}
              </div>
              {connection.status == 'disconnected' ? (
                <small id="disconnect-btn-warning">This connection has been disconnected</small>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                  <a
                    id="disconnect-btn"
                    href={`/connection/disconnect/${Html.escapeHtml(connection.id)}`}
                    data-variant={'filled'}
                  >
                    <span>Disconnect</span>
                  </a>
                  <small id="disconnect-btn-warning">
                    This action will revoke connection with {Html.escapeHtml(connection.company_name)}
                  </small>
                </div>
              )}

              {bankDetails ? (
                <safe>
                  <div id="profile-form-bank">
                    <h3>Bank Details: </h3>
                    <b class="connection-status" data-status="success">
                      Resolved
                    </b>
                    {Html.escapeHtml(connection.updated_at.toLocaleDateString())}
                  </div>
                  <div id="profile-form-bank-info">
                    <p>
                      Company Name: <b>{Html.escapeHtml(bankDetails.name)}</b>
                    </p>
                    <p>
                      Country: <b>{Html.escapeHtml(bankDetails.countryCode)}</b>
                    </p>
                    <p>
                      Account number: <b>{Html.escapeHtml(bankDetails.accountId)}</b>
                    </p>
                    <p>
                      Clearing System ID: <b>{Html.escapeHtml(bankDetails.clearingSystemId)}</b>
                    </p>
                  </div>
                </safe>
              ) : (
                <h3>
                  Bank Details:
                  <b class="connection-status" data-status="disabled">
                    Unresolved
                  </b>
                </h3>
              )}
            </div>
          </div>
        </div>
      </Page>
    )
  }

  public disconnectPage = (connection: ConnectionRow) => {
    return (
      <Page
        title="Veritable - Disconnect Connection"
        heading="Disconnect Connection"
        activePage="connections"
        headerLinks={[{ name: 'Connection Management', url: '#' }]}
        stylesheets={['disconnect.css']}
      >
        <div id="disconnect-container">
          <h2>Are you sure you want to revoke connection with {Html.escapeHtml(connection.company_name)}?</h2>

          <p>
            This action is irreversible: you wil loose the ability to send or receive queries and credentials with this
            company, and all ongoing exchanges will be terminated.
          </p>
          <p>If you wish to reconnect later, you will need to restart the verification process.</p>
          <div id="disconnect-buttons">
            {/* <LinkButton
              style="outlined"
              text="Disconnect"
              href={`/connection/disconnect/${connection.id}?disconnect=true`}
            /> */}
            <a
              id="disconnect-btn"
              href={`/connection/disconnect/${connection.id}?disconnect=true`}
              data-variant={'filled'}
            >
              <span>Disconnect</span>
            </a>
            <LinkButton style="filled" text="Cancel" href={`/connection/profile/${connection.id}`} />
          </div>
        </div>
      </Page>
    )
  }

  private connectionRow = ({
    company_name,
    company_number,
    registry_country_code,
    id,
    status,
    pin_tries_remaining_count,
  }: ConnectionRow) => {
    return (
      <tr>
        <td>{Html.escapeHtml(company_number)}</td>
        <td>{Html.escapeHtml(company_name)}</td>
        <td>{Html.escapeHtml(registry_country_code)}</td>
        <td>{connectionStatusToClass(status)}</td>
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
