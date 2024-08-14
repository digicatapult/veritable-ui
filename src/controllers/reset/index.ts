import { Get, Hidden, Produces, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { BadRequestError, InternalError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import type { TABLE } from '../../models/db/types.js'
import VeritableCloudagent, { Connection, Credential } from '../../models/veritableCloudagent.js'

@singleton()
@injectable()
@Security('oauth2')
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
  private async isReset(): Promise<boolean> {
    const tables: TABLE[] = ['connection', 'connection_invite', 'query', 'query_rpc']
    try {
      const items: number[] = await Promise.all([
        ...tables.map(async (table: TABLE) => await this.db.get(table).then((res) => res.length)),
        await this.cloudagent.getCredentials().then((res) => res.length),
        await this.cloudagent.getConnections().then((res) => res.length),
      ])

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
      const connections: Connection[] = await this.cloudagent.getConnections()
      const credentials: Credential[] = await Promise.all(
        connections.map(({ id }: { id: string }) => {
          return this.cloudagent.getCredentialByConnectionId(id)
        })
      ).then((credentials) => credentials.reduce((prev, next) => prev.concat(next), []))

      this.logger.debug('found items at cloudagent: %j', { credentials, connections })

      await Promise.all([
        ...credentials.map(({ id }: { id: string }) => {
          this.logger.debug('deleting credential from cloudagent %s: ', id)
          return this.cloudagent.deleteCredential(id)
        }),
        ...connections.map(({ id }: { id: string }) => {
          this.logger.debug('deleting connection from cloudagent %s: ', id)
          return this.cloudagent.deleteConnection(id)
        }),
        await this.db.delete('connection', {}),
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
