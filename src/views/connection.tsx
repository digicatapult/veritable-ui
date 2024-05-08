import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from './common'

interface connection {
  company_name: string
  status: 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'
}

@singleton()
export default class ConnectionTemplates {
  constructor() {}

  public listPage = (connections: connection[]) => {
    return (
      <Page title="Veritable - Connections">
        {connections.map((connection) => (
          <div>
            <div>{Html.escapeHtml(connection.company_name)}</div>
            <div>{connection.status}</div>
          </div>
        ))}
      </Page>
    )
  }
}
