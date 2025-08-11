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
    this.cloudagent.on('ConnectionDidRotated', this.connectionDidRotatedHandler)
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
          'Connection event on unknown connection %s with state %s',
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
      return
    })
  }

  private connectionDidRotatedHandler: eventData<'ConnectionDidRotated'> = async (event) => {
    this.logger.debug(`new DID rotation event %j`, event.payload)
    const { outOfBandId, state: connectionState } = event.payload.connectionRecord

    await this.db.withTransaction(async (db) => {
      // Get the connection id from the OOB invitation id in the event payload
      // TODO: figure out how to catch this event if we are using direct DID-mediated connections
      // at present the event from credo-ts doesn't emit any of their DIDs if one is invalidated
      // and the connection record
      const [outOfBandRecord] = await db.get('connection_invite', {
        oob_invite_id: outOfBandId,
      })
      const { connection_id: cloudAgentConnectionId } = outOfBandRecord
      // If this is a disconnection event (ie rotated to 0/null/undefined)
      if (!event.payload.theirDid?.to && connectionState === 'completed') {
        this.logger.warn('Connection %s has disconnected from us', cloudAgentConnectionId)
        // Mark as disconnected in db
        await this.db.update(
          'connection',
          { id: cloudAgentConnectionId, status: 'verified_both' },
          { status: 'disconnected' }
        )
      }
    })

    return
  }
}
