import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { credentialStatusToClass, LinkButton, Page } from '../common.js'

import type { Credential } from '../../models/veritableCloudagent/internal.js'

export type ExtendedCredential = Credential & { companyName: string; type: 'Supplier credentials' }

@singleton()
export default class CredentialListTemplates {
  constructor() {}

  private roleToDirection = (role: Credential['role']): JSX.Element => {
    switch (role) {
      case 'holder':
        return <p>Received</p>
      case 'issuer':
        return <p>Given</p>
      default:
        return <p>unknown</p>
    }
  }

  private buttonText = (state: Credential['state']): string => {
    switch (state) {
      case 'done':
        return 'View Credential'
      default:
        return 'default'
    }
  }

  public listPage = (credentials: ExtendedCredential[], search: string = '') => {
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
              onkeypress="this.style.width = ((this.value.length + 1) * 8) + 'px';"
            ></input>
          </div>
          <table class="list-page">
            <thead>
              {['Company Name', 'Credential Type', 'Direction', 'Crendetial status', 'Actions'].map((name: string) => (
                <th>
                  <span>{Html.escapeHtml(name || 'unknown')}</span>
                  <a class="list-filter-icon icon disabled" />
                </th>
              ))}
            </thead>
            <tbody id="search-results">
              {credentials.length == 0 ? (
                <tr>
                  <td>No Credentials found</td>
                </tr>
              ) : (
                credentials.map((cred) => {
                  return (
                    <tr>
                      <td>{Html.escapeHtml(cred.companyName)}</td>
                      <td>{Html.escapeHtml(cred.type)}</td>
                      <td>{this.roleToDirection(cred.role)}</td>
                      <td>{credentialStatusToClass(cred.state)}</td>
                      <td>
                        <LinkButton
                          icon='url("/public/images/dot-icon.svg")'
                          style="outlined"
                          disabled={true}
                          text={this.buttonText(cred.state)}
                          href={
                            // Left as a reference so not sure if we have a page/pages for buttons
                            cred.state === 'done' && cred.role == 'issuer'
                              ? `/creds/issuer/${cred.id}`
                              : `/cred/holder/${cred.id}`
                          }
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
