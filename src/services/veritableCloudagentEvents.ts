import { inject, injectable, singleton } from 'tsyringe'
import WebSocket from 'ws'
import { z } from 'zod'

import { Env } from '../env.js'
import { Logger, type ILogger } from '../logger.js'
import VeritableCloudagent, { connectionParser } from '../models/veritableCloudagent.js'
import IndexedAsyncEventEmitter from '../utils/indexedAsyncEventEmitter.js'
import { MapDiscriminatedUnion } from '../utils/types.js'

const eventParser = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ConnectionStateChanged'),
    payload: z.object({
      connectionRecord: connectionParser,
    }),
  }),
  z.object({ type: z.literal('BasicMessageStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('ConnectionDidRotated'), payload: z.object({}) }),
  z.object({ type: z.literal('CredentialStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('RevocationNotificationReceived'), payload: z.object({}) }),
  z.object({ type: z.literal('DrpcRequestStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('DrpcResponseStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('ProofStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('TrustPingReceivedEvent'), payload: z.object({}) }),
  z.object({ type: z.literal('TrustPingResponseReceivedEvent'), payload: z.object({}) }),
  z.object({ type: z.literal('VerifiedDrpcRequestStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('VerifiedDrpcResponseStateChanged'), payload: z.object({}) }),
])
type WebSocketEvent = z.infer<typeof eventParser>
type WebSocketEventMap = MapDiscriminatedUnion<WebSocketEvent, 'type'>
type WebSocketEventNames = WebSocketEvent['type']

@singleton()
@injectable()
export default class VeritableCloudagentEvents extends IndexedAsyncEventEmitter<
  WebSocketEventNames,
  {
    [key in WebSocketEventNames]: WebSocketEventMap[key]
  }
> {
  private internalStatus: 'IDLE' | 'CONNECTED' | 'ERRORED' = 'IDLE'
  private socket?: WebSocket
  private closeTimeoutId?: NodeJS.Timeout

  constructor(
    private env: Env,
    private veritable: VeritableCloudagent,
    @inject(Logger) protected logger: ILogger
  ) {
    super()
  }

  get status() {
    return this.internalStatus
  }

  public start = (): Promise<void> => {
    if (this.socket) {
      throw new Error('WebSocket already started')
    }

    let resolve: () => void
    const returnedPromise = new Promise<void>((res) => {
      resolve = res
    })

    const socket = new WebSocket(this.env.get('CLOUDAGENT_ADMIN_WS_ORIGIN'))
    socket.addEventListener('open', async () => {
      this.logger.info('WebSocket connection to Cloudagent established')
      this.internalStatus = 'CONNECTED'
      const connectionSeen = new Set<string>()

      socket.addEventListener('message', (ev: WebSocket.MessageEvent) => {
        this.logger.debug('WebSocket Message Received')
        let data: WebSocketEvent
        try {
          data = eventParser.parse(JSON.parse(ev.data.toString()))
        } catch (err) {
          this.logger.warn('Unusable event received %o', ev.data)
          return
        }

        let id: string
        const type = data.type
        this.logger.debug('WebSocket Message if of type %s', type)
        switch (type) {
          case 'ConnectionStateChanged':
            id = data.payload.connectionRecord.id
            connectionSeen.add(id)
            break
          default:
            this.logger.trace('Skipping %s event', type)
            return
        }

        this.emitIndexed(data.type, id, data)
      })

      for (const connection of await this.veritable.getConnections()) {
        if (!connectionSeen.has(connection.id)) {
          this.emitIndexed('ConnectionStateChanged', connection.id, {
            type: 'ConnectionStateChanged',
            payload: { connectionRecord: connection },
          })
        }
      }

      resolve()
    })

    socket.addEventListener('close', this.closeHandler)

    this.socket = socket

    return returnedPromise
  }

  public stop = () => {
    this.internalStatus = 'IDLE'

    if (this.socket) {
      this.socket.removeEventListener('close', this.closeHandler)
      this.socket.close()
      this.socket = undefined
      return
    }

    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId)
    }
  }

  private closeHandler = () => {
    this.internalStatus = 'ERRORED'
    this.socket = undefined
    this.closeTimeoutId = setTimeout(this.start, 10000)
  }
}
