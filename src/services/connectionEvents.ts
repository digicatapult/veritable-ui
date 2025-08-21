import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../logger.js'
import Database from '../models/db/index.js'
import VeritableCloudagentEvents from './veritableCloudagentEvents.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudagentOn: VeritableCloudagentEvents['on']
type eventData<T> = Parameters<typeof CloudagentOn<T>>[1]

@singleton()
@injectable()
export default class ConnectionEvents {
  constructor(
    private db: Database,
    private cloudagent: VeritableCloudagentEvents,
    @inject(Logger) protected logger: ILogger
  ) {}

  public start() {
    this.cloudagent.on('ConnectionStateChanged', this.connectionStateChangedHandler)
  }

  private connectionStateChangedHandler: eventData<'ConnectionStateChanged'> = async (event) => {
    this.logger.debug(`new connection event %j`, event.payload)
    const connectionState = event.payload.connectionRecord.state
    if (connectionState !== 'abandoned' && connectionState !== 'completed') {
      return
    }

    const { id: cloudAgentConnectionId, outOfBandId } = event.payload.connectionRecord
    await this.db.withTransaction(async (db) => {
      const [inviteRecord] = await db.get('connection_invite', { oob_invite_id: outOfBandId })
      if (!inviteRecord) {
        this.logger.warn(
          'Connection event on agent_connection_id %s with state %s has no invitation record',
          cloudAgentConnectionId,
          connectionState
        )
        throw new Error('Connection event on unknown connection')
      }

      const [connection] = await db.get('connection', { id: inviteRecord.connection_id })

      if (connectionState === 'abandoned' && connection.status === 'disconnected') {
        this.logger.debug('Connection abandoned and disconnected')
        return
      }

      if (connectionState === 'completed' && connection.status !== 'pending') {
        this.logger.debug('Connection completed with status not pending')
        return
      }

      const updateStatus = connectionState === 'completed' ? 'unverified' : 'disconnected'
      await db.update(
        'connection',
        { id: inviteRecord.connection_id, status: connection.status },
        { status: updateStatus, agent_connection_id: cloudAgentConnectionId }
      )
      this.logger.debug('Database state for connection %s updated to %s', connection.id, updateStatus)
      return
    })
  }
}
