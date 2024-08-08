import { Get, Hidden, Produces, Route, SuccessResponse } from 'tsoa'
import { container, inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'

const env = container.resolve(Env)
const DEMO_MODE = env.get('DEMO_MODE')

@singleton()
@injectable()
// @Security('oauth2')
@Route('/reset')
@Hidden()
@Produces('text/html')
export class ResetController {
  constructor(
    private db: Database,
    private cloudagent: VeritableCloudagent,
    @inject(Logger) private logger: ILogger
  ) {
//    super()
    this.logger = logger.child({ controller: '/reset' })
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Get('/')
  public async listConnections(): Promise<{ statusCode: number }> {
    if (!DEMO_MODE) {
      this.logger.debug('Instance is not in DEMO_MODE')

      return { statusCode: 400 }
    }
    /* to include in the PR if DEMO_MODE=false
      $ curl -i -X GET http://localhost:3000/reset
      HTTP/1.1 400 Bad Request
      X-Powered-By: Express
      Content-Type: text/plain; charset=utf-8
      Content-Length: 11
      ETag: W/"b-EFiDB1U+dmqzx9Mo2UjcZ1SJPO8"
      Vary: Accept-Encoding
      Date: Wed, 07 Aug 2024 13:16:39 GMT
      Connection: keep-alive
      Keep-Alive: timeout=5

      Bad Request (400)
    */

      /*
        - [x] get all connections
        - [x] iterate over all connections
        - [x] call cloudagent's API to get credentials for each connection_id
        - [x] call /v1/connections/{connectionId} (DELETE) endpoint for each connection
        - [x] call /v1/credentials/{credentialRecordId} (DELETE) endpoint for each credential
        - [x] delete local connection and connection_invite records
        - [ ] a check to confirm that the above has happened
      onSuccess:
      HTTP/1.1 200 OK
      X-Powered-By: Express
      Content-Type: text/plain; charset=utf-8
      Content-Length: 2
      ETag: W/"2-nOO9QiTIwXgNtWtBJezz8kv3SLc"
      Vary: Accept-Encoding
      Date: Thu, 08 Aug 2024 07:21:07 GMT
      Connection: keep-alive
      Keep-Alive: timeout=5
      */
    const connections = await this.db.get('connection') || []
    const agentConnectionIds: string[] = connections
      .map((connection: ConnectionRow) => connection.agent_connection_id as string)
      .filter(Boolean)

    this.logger.debug('%j', { connections, agentConnectionIds })

    const agent = {
      credentials: await Promise.all(agentConnectionIds.map((id: string) => {
        return this.cloudagent.getCredentialByConnectionId(id)
      })).then((credentials) => credentials.reduce((prev, next) => prev.concat(next), [])),
      connections: await Promise.all(agentConnectionIds.map((id: string) => {
        return this.cloudagent.getConnectionById(id)
      }))
    }

    await Promise.all(agent.credentials.map(({ id }: { id: string}) => {
      this.logger.debug('deleting credential from cloudagent %s: ', id)
      return this.cloudagent.deleteCredential(id)
    }))
    await Promise.all(agent.connections.map(({ id }: { id: string}) => {
      this.logger.debug('deleting connection from cloudagent %s: ', id)
      return this.cloudagent.deleteConnection(id)
    }))

    this.logger.debug('credentials found %j', { agent, })

    await this.db.delete('connection', {})
    await this.db.delete('connection_invite', {})
        
    return { statusCode: 200 }
  }
}
