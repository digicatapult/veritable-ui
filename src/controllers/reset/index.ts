import express from 'express'
import { Delete, Hidden, Produces, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import pino from 'pino'
import { Env } from '../../env/index.js'
import { BadRequestError, InternalError } from '../../errors.js'
import Database from '../../models/db/index.js'
import type { TABLE } from '../../models/db/types.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { Connection, Credential } from '../../models/veritableCloudagent/internal.js'

@injectable()
@Security('oauth2')
@Route('/reset')
@Hidden()
@Produces('text/html')
export class ResetController {
  constructor(
    private env: Env,
    private db: Database,
    private cloudagent: VeritableCloudagent
  ) {}

  // would be nice to restore to prior reset
  private async isReset(logger: pino.Logger): Promise<boolean> {
    const tables: TABLE[] = ['connection', 'connection_invite', 'query', 'query_rpc']
    try {
      const results = await Promise.allSettled([
        ...tables.map(async (table: TABLE) => await this.db.get(table).then((res) => res.length)),
        await this.cloudagent.getCredentials().then((res) => res.length),
        await this.cloudagent.getConnections().then((res) => res.length),
      ])

      const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
      const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

      if (rejected.length > 0) {
        throw new Error(`${rejected.length} Resets were rejected with Error: ${rejected[0]}`)
      }

      return (
        fulfilled.reduce((out: number, next: number) => {
          return out + next
        }, 0) === 0
      )
    } catch (err: unknown) {
      logger.warn('error occured while resetting %s', err)
      return false
    }
  }

  /**
   * Retrieves the connection list page
   */
  @SuccessResponse(200)
  @Delete('/')
  public async reset(@Request() req: express.Request): Promise<{ statusCode: number }> {
    const DEMO_MODE = this.env.get('DEMO_MODE')
    if (!DEMO_MODE) {
      req.log.info('bad request DEMO_MODE=%s', DEMO_MODE)
      throw new BadRequestError('DEMO_MODE is false')
    }

    try {
      const connections: Connection[] = await this.cloudagent.getConnections()
      const credentials: Credential[] = await this.cloudagent.getCredentials()

      req.log.info('items to be deleted: %j', { credentials, connections })

      const results = await Promise.allSettled([
        ...(credentials.length > 0
          ? credentials.map(({ id }: { id: string }) => {
              req.log.debug('deleting credential from cloudagent %s: ', id)
              return this.cloudagent.deleteCredential(id)
            })
          : []),

        ...(connections.length > 0
          ? connections.map(({ id }: { id: string }) => {
              req.log.debug('closing and deleting connection from cloudagent %s: ', id)
              return this.cloudagent.closeConnection(id, 'delete')
            })
          : []),

        await this.db.delete('connection', {}),
        await this.db.delete('connection_invite', {}),
      ])

      const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

      if (rejected.length > 0) {
        throw new Error(`${rejected.length} deletions were rejected with Error: ${rejected[0]}`)
      }

      req.log.debug('items have been deleted and running check to confirm')
      // confirm reset by calling isReset() method
      if (!(await this.isReset(req.log))) {
        req.log.warn('reset isReset() check has failed')
        throw new InternalError('reset failed')
      }

      return { statusCode: 200 }
    } catch (err: unknown) {
      throw new InternalError(err as string)
    }
  }
}
