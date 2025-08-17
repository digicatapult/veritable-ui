import express from 'express'
import { Delete, Hidden, Produces, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import { Env } from '../../env/index.js'
import { ForbiddenError, InternalError } from '../../errors.js'
import Database from '../../models/db/index.js'
import type { TABLE } from '../../models/db/types.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'

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

  private async isReset(): Promise<void> {
    const tables: TABLE[] = ['connection', 'connection_invite', 'query', 'query_rpc']
    const results = await Promise.allSettled([
      (async () => {
        const nonEmptyTables: string[] = []
        for (const table of tables) {
          const rows = await this.db.get(table, {})
          if (rows.length > 0) nonEmptyTables.push(`${table} (${rows.length} rows)`)
        }
        if (nonEmptyTables.length > 0) {
          throw new Error(`Non-empty DB tables:\n- ${nonEmptyTables.join('\n- ')}`)
        }
      })(),

      (async () => {
        const errors: string[] = []
        const connections = await this.cloudagent.getConnections()
        if (connections.length > 0) errors.push(`${connections.length} connections remain`)

        const credentials = await this.cloudagent.getCredentials()
        if (credentials.length > 0) errors.push(`${credentials.length} credentials remain`)

        const OOBinvites = await this.cloudagent.getOutOfBandInvites()
        if (OOBinvites.length > 0) errors.push(`${OOBinvites.length} out-of-band invites remain`)

        if (errors.length > 0) {
          throw new Error(`Non-empty CloudAgent items:\n- ${errors.join('\n- ')}`)
        }
      })(),
    ])

    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason)

    if (rejected.length > 0) {
      throw new Error(`${rejected.length} checks failed: ${rejected}`)
    }
  }

  @SuccessResponse(200)
  @Delete('/')
  public async reset(@Request() req: express.Request): Promise<{ statusCode: number }> {
    const DEMO_MODE = this.env.get('DEMO_MODE')
    if (!DEMO_MODE) {
      req.log.info('bad request DEMO_MODE=%s', DEMO_MODE)
      throw new ForbiddenError('DEMO_MODE is false')
    }

    const tables: TABLE[] = ['connection', 'connection_invite', 'query', 'query_rpc']
    const results = await Promise.allSettled([
      (async () => {
        // DB cleanup of all tables (sequential)
        for (const table of tables) {
          await this.db.delete(table, {})
        }
      })(),

      (async () => {
        // CloudAgent cleanup (sequential)
        const connections = await this.cloudagent.getConnections()
        const credentials = await this.cloudagent.getCredentials()
        const invites = await this.cloudagent.getOutOfBandInvites()

        req.log.info('items to be deleted: %j', { credentials, connections, invites })

        for (const connection of connections) {
          await this.cloudagent.deleteConnection(connection.id)
        }
        for (const invite of invites) {
          await this.cloudagent.deleteOutOfBandInvite(invite.id)
        }
        for (const credential of credentials) {
          await this.cloudagent.deleteCredential(credential.id)
        }
      })(),
    ])

    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason)

    if (rejected.length > 0) {
      throw new InternalError(`${rejected.length} deletions failed:\n- ${rejected.map(String).join('\n- ')}`)
    }

    req.log.debug('running check to confirm all items have been deleted')
    // confirm reset by calling isReset() method - TODO: is this necessary?
    try {
      await this.isReset()
      req.log.info(`reset successful`)
    } catch (error) {
      throw new InternalError(`reset failed: ${error}`)
    }

    return { statusCode: 200 }
  }
}
