import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Credential } from '../../models/veritableCloudagent.js'
import { LinkButton, Page } from '../common.js'

type State =
  | 'pending'
  | 'proposal-sent'
  | 'proposal-received'
  | 'offer-sent'
  | 'offer-received'
  | 'declined'
  | 'request-sent'
  | 'request-received'
  | 'credential-issued'
  | 'credential-received'
  | 'done'
  | 'abandoned'

type Role = 'issuer' | 'holder'
export interface ICredentials extends Credential {
  id: string
  connectionId: string
  company_name: string
  credential_attributes: { name: string; value: string }[]
  updated_at: Date
}

@singleton()
export default class CredentialListTemplates {
  constructor() {}

  private statusToClass = (state: State): JSX.Element => {
    switch (state) {
      case 'pending':
        return (
          <div class="list-item-status" data-status="warning">
            Pending
          </div>
        )
      case 'done':
        return (
          <div class="list-item-status" data-status="success">
            Resolved
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

  private roleToDirection = (role: Role): JSX.Element => {
    switch (role) {
      case 'holder':
        return <p>Received</p>
      case 'issuer':
        return <p>Given</p>
      default:
        return <p>unknown</p>
    }
  }

  private buttonText = (state: State): string => {
    switch (state) {
      case 'pending':
        return 'View Request'
      case 'done':
        return 'View Credential'
      default:
        return 'default'
    }
  }

  public listPage = (credentials: Credential[], search: string = '') => {
    return (
      <Page
        title="Veritable - Credentials"
        heading="Credential Management"
        activePage="credentials"
        headerLinks={[{ name: 'Credential Management', url: '/credentials' }]}
        stylesheets={['query.css']}
        hx-get="/credentials"
        hx-trigger="every 10s"
        hx-select="#search-results"
        hx-target="#search-results"
        hx-swap="outerHTML"
        hx-include="#queries-search-input"
      >
        <div class="list-page-header">
          <span>Credential Management</span>
          <LinkButton
            disabled={true}
            text="New Credential"
            href="/credentials/new"
            icon={'url("/public/images/plus.svg")'}
            style="filled"
          />
        </div>
        <div class="list-page ">
          <div class="list-nav">
            <span>Credentials</span>
            <input
              id="queries-search-input"
              class="search-window"
              type="search"
              name="search"
              value={Html.escapeHtml(search)}
              placeholder="Search"
              hx-get="/credentials"
              hx-trigger="input changed delay:500ms, search"
              hx-target="#search-results"
              hx-select="#search-results"
              hx-swap="outerHTML"
            ></input>
          </div>
          <table class="list-page">
            <thead>
              {['Company Name', 'Credential Type', 'Direction', 'Crendetial status', 'Actions'].map((name: string) => (
                <th>
                  <span>{name || 'unknown'}</span>
                  <a class="list-filter-icon icon disabled" />
                </th>
              ))}
            </thead>
            <tbody id="search-results">
              {credentials.length == 0 ? (
                <tr>
                  <td>No Credentials for that search. Try again or add a new credential</td>
                </tr>
              ) : (
                credentials.map((credential) => (
                  <tr>
                    <td>
                      {Html.escapeHtml(credential?.credentialAttributes && credential.credentialAttributes[0].value)}
                    </td>
                    <td>{Html.escapeHtml('Supplier Credential')}</td>
                    <td>{this.roleToDirection(credential.role)}</td>
                    <td>{this.statusToClass(credential.state)}</td>
                    <td>
                      <LinkButton
                        icon='url("/public/images/dot-icon.svg")'
                        style="outlined"
                        disabled={true}
                        text={this.buttonText(credential.state)}
                        href={
                          // Left as a reference so not sure if we have a page/pages for buttons
                          credential.state === 'done' && credential.role == 'issuer'
                            ? `/credentials/issuer/${credential.id}`
                            : `/credential/holder/${credential.id}`
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
