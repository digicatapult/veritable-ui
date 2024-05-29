import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ButtonIcon, Page } from './common.js'

type ConnectionStatus = 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'

interface connection {
  company_name: string
  status: ConnectionStatus
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

  public listPage = (connections: connection[]) => {
    return (
      <Page title="Veritable - Connections" heading="Connections" url="/connection">
        <div class="main connections">
          <div class="connections header">
            <span>Connections Summary</span>
            <ButtonIcon disabled={true} name="Add a New Connection" />
          </div>
          <div class="connections list">
            <div class="connections list nav">
              <span>Connections</span>
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
              {connections.map((connection) => (
                <tr>
                  <td>{Html.escapeHtml(connection.company_name)}</td>
                  <td>{this.statusToClass(connection.status)}</td>
                  <td>
                    <ButtonIcon
                      icon='url("/public/images/dot-icon.svg")'
                      outline={true}
                      disabled={true}
                      name="some action"
                    />
                  </td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      </Page>
    )
  }
}
