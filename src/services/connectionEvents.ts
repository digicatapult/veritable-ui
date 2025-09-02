import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../logger.js'
import Database from '../models/db/index.js'
import VeritableCloudagent from '../models/veritableCloudagent/index.js'
import VeritableCloudagentEvents from './veritableCloudagentEvents.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudagentOn: VeritableCloudagentEvents['on']
type eventData<T> = Parameters<typeof CloudagentOn<T>>[1]

@singleton()
@injectable()
export default class ConnectionEvents {
  constructor(
    private db: Database,
    private cloudagent: VeritableCloudagent,
    private cloudagentEvents: VeritableCloudagentEvents,
    @inject(Logger) protected logger: ILogger
  ) {}

  public start() {
    this.cloudagentEvents.on('ConnectionStateChanged', this.connectionStateChangedHandler)
    this.cloudagentEvents.on('ConnectionDidRotated', this.connectionDidRotatedHandler)
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
        this.cloudagent.closeConnection(cloudAgentConnectionId)
        this.logger.warn('Hangup message automatically sent to connection %s', cloudAgentConnectionId)
        return
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
        { id: connection.id, status: connection.status },
        { agent_connection_id: cloudAgentConnectionId, status: updateStatus }
      )
      this.logger.debug('Database state for connection %s updated to %s', connection.id, updateStatus)
      return
    })
  }

  /*
  Hangup protocol: ConnectionRecord (NB OOB record doesn't change)
  Message sender:
  - Rotates their own Did into previousDids
  - Did is blank
  - Keeps theirDid active
  
  Message recipient:
  - Rotates theirDid into previousTheirDid
  - theirDid is blank
  - Keeps Did active
  */
  private connectionDidRotatedHandler: eventData<'ConnectionDidRotated'> = async (event) => {
    this.logger.debug(`new DID rotation event %j`, event.payload)
    const { id: cloudAgentConnectionId } = event.payload.connectionRecord

    // If this is a disconnection event (ie theirDid rotated to undefined)
    if (!event.payload.theirDid?.to) {
      this.logger.warn('Connection %s has disconnected from us', cloudAgentConnectionId)
      await this.db.update('connection', { agent_connection_id: cloudAgentConnectionId }, { status: 'disconnected' })
    }

    return
  }
}
