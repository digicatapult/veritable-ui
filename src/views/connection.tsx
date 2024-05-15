import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page, ButtonWithIcon } from './common'

interface connection {
  company_name: string
  status: 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'
}

@singleton()
export default class ConnectionTemplates {
  constructor() {}

  public listPage = (connections: connection[]) => {
    return (
      <Page title="Veritable - Connections" heading="Connections" url="/connection">
        <div class='main connections'>
          <div class='connections header'>
            <span>Connections Summary</span>
            <ButtonWithIcon name='Add a New Connection' /> 
          </div>
          <div class='connections list'>
            <div class='connections list nav'>
              <span>Connections</span>
              <input />
              <input />
              <span>test</span>
            </div>
            <div class='connections list table'>
              {connections.map((connection) => (
                <div>
                  <div>{Html.escapeHtml(connection.company_name)}</div>
                  <div>{connection.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </Page>
    )
  }
}
