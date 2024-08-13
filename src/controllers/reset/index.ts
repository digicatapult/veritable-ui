import { Get, Hidden, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { BadRequestError, InternalError } from '../../errors.js'
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
    this.logger = logger.child({ controller: '/reset' })
  }

  // would be nice to restore to prior reset
  public async isReset(): Promise<boolean> {
    try {
      const items: number[] = await Promise.all([
        await this.db.get('connection', {}).then((res) => res.length),
        await this.db.get('connection_invite', {}).then((res) => res.length),
        await this.cloudagent.getCredentials().then((res) => res.length),
        await this.cloudagent.getConnections().then((res) => res.length),
      ])

      this.logger.debug(
        'items that have been not deleted:connection %s, inviute %s, credentials %s, connections %s',
        items[0],
        items[1],
        items[2],
        items[3]
      )

      return (
        items.reduce((out: number, next: number) => {
          return out + next
        }, 0) === 0
      )
    } catch (err: unknown) {
      this.logger.debug('%s', err)

      return false
    }
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

    try {
      const connections = (await this.db.get('connection')) || []
      this.logger.debug('found connection %j', { connections })
      const agentConnectionIds: string[] = connections
        .map((connection: ConnectionRow) => connection.agent_connection_id as string)
        .filter(Boolean)

      this.logger.debug('found items: %j', { connections, agentConnectionIds })

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

      await Promise.all([
        ...agent.credentials.map(({ id }: { id: string }) => {
          this.logger.debug('deleting credential from cloudagent %s: ', id)
          return this.cloudagent.deleteCredential(id)
        }),
        ...agent.connections.map(({ id }: { id: string }) => {
          this.logger.debug('deleting connection from cloudagent %s: ', id)
          return this.cloudagent.deleteConnection(id)
        }),
        await this.db.delete('connection', {}),
        await this.db.delete('connection_invite', {}),
      ])

      // confirm reset by calling isReset() method
      if (!(await this.isReset())) {
        throw new InternalError('reset failed')
      }

      return { statusCode: 200 }
    } catch (err: unknown) {
      throw new InternalError(err as string)
    }
  }
}
