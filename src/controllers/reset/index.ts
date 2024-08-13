import { Get, Hidden, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { BadRequestError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import type { ConnectionRow } from '../../models/db/types.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'

@singleton()
@injectable()
// @Security('oauth2')
@Route('/reset')
@Hidden()
@Produces('text/html')
export class ResetController {
  constructor(
    private env: Env,
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
  public async reset(): Promise<{ statusCode: number }> {
    const DEMO_MODE = this.env.get('DEMO_MODE')
    if (!DEMO_MODE) {
      this.logger.debug('Instance is not in DEMO_MODE')

      throw new BadRequestError('DEMO_MODE is false')
    }
    /*
      - [x] get all connections
      - [x] iterate over all connections
      - [x] call cloudagent's API to get credentials for each connection_id
      - [x] call /v1/connections/{connectionId} (DELETE) endpoint for each connection
      - [x] call /v1/credentials/{credentialRecordId} (DELETE) endpoint for each credential
      - [x] delete local connection and connection_invite records
      - [ ] a check to confirm that the above has happened
    */
    const connections = (await this.db.get('connection')) || []
    const agentConnectionIds: string[] = connections
      .map((connection: ConnectionRow) => connection.agent_connection_id as string)
      .filter(Boolean)

    this.logger.debug('%j', { connections, agentConnectionIds })

    const agent = {
      credentials: await Promise.all(
        agentConnectionIds.map((id: string) => {
          return this.cloudagent.getCredentialByConnectionId(id)
        })
      ).then((credentials) => credentials.reduce((prev, next) => prev.concat(next), [])),
      connections: await Promise.all(
        agentConnectionIds.map((id: string) => {
          return this.cloudagent.getConnectionById(id)
        })
      ),
    }

    await Promise.all(
      agent.credentials.map(({ id }: { id: string }) => {
        this.logger.debug('deleting credential from cloudagent %s: ', id)
        return this.cloudagent.deleteCredential(id)
      })
    )

    await Promise.all(
      agent.connections.map(({ id }: { id: string }) => {
        this.logger.debug('deleting connection from cloudagent %s: ', id)
        return this.cloudagent.deleteConnection(id)
      })
    )

    this.logger.debug('credentials found %j', { agent })

    await this.db.delete('connection', {})
    await this.db.delete('connection_invite', {})

    return { statusCode: 200 }
  }
}
