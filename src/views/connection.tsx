import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ButtonIcon, Page } from './common'

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
      case 'unverified':
        return (
          <div class="warning">
            {status == 'verified_them'
              ? 'Pending Your Verification'
              : status == 'verified_us'
                ? 'Pending Their Verification'
                : status == 'unverified'
                  ? 'Unverified cc @esther'
                  : 'unlknown'}
          </div>
        )
      case 'disconnected':
        return <div class="disconnected">Disconnected</div>
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
            <div style="overflow-x:auto;">
              <table class="connections list">
                <tr>
                  <th>
                    <span>Company Name</span>
                    <span class="icon" />
                  </th>
                  <th>Verification Status</th>
                  <th>Actions</th>
                </tr>
                {connections.map((connection) => (
                  <tr>
                    <td>{Html.escapeHtml(connection.company_name)}</td>
                    <td>{this.statusToClass(Html.escapeHtml(connection.status))}</td>
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
        </div>
      </Page>
    )
  }
}
