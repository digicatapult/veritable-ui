import { inject, injectable, singleton } from 'tsyringe'
import WebSocket from 'ws'
import { z } from 'zod'

import { Env } from '../env/index.js'
import { Logger, type ILogger } from '../logger.js'
import VeritableCloudagent from '../models/veritableCloudagent/index.js'
import { connectionParser, credentialParser } from '../models/veritableCloudagent/internal.js'

import IndexedAsyncEventEmitter from '../utils/indexedAsyncEventEmitter.js'
import { MapDiscriminatedUnion } from '../utils/types.js'

const drpcRequestParser = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.record(z.any(), z.any()).optional(),
  id: z.string(),
})
const eventParser = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ConnectionStateChanged'),
    payload: z.object({
      connectionRecord: connectionParser,
    }),
  }),
  z.object({
    type: z.literal('CredentialStateChanged'),
    payload: z.object({
      credentialRecord: credentialParser,
    }),
  }),
  z.object({ type: z.literal('BasicMessageStateChanged'), payload: z.object({}) }),
  z.object({ type: z.literal('ConnectionDidRotated'), payload: z.object({}) }),
  z.object({ type: z.literal('RevocationNotificationReceived'), payload: z.object({}) }),
  z.object({
    type: z.literal('DrpcRequestStateChanged'),
    payload: z.object({
      drpcMessageRecord: z.object({
        request: drpcRequestParser.optional(),
        connectionId: z.string(),
        role: z.union([z.literal('client'), z.literal('server')]),
        state: z.union([z.literal('request-sent'), z.literal('request-received'), z.literal('completed')]),
      }),
    }),
  }),
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudagentOn: VeritableCloudagentEvents['on']
export type eventData<T> = Parameters<typeof CloudagentOn<T>>[1]
export type DrpcRequest = z.infer<typeof drpcRequestParser>

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
  private heartbeatTimeout?: NodeJS.Timeout

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

  private heartbeat = () => {
    this.logger.debug('WebSocket PING')
    clearTimeout(this.heartbeatTimeout)
    this.heartbeatTimeout = setTimeout(() => {
      this.logger.debug('WebSocket PING timed out')
      this.socket?.terminate()
    }, this.env.get('CLOUDAGENT_ADMIN_PING_TIMEOUT_MS'))
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
      this.logger.info('WebSocket connection to CloudAgent established')
      this.internalStatus = 'CONNECTED'

      this.heartbeat()

      const connectionSeen = new Set<string>()
      const credentialSeen = new Set<string>()

      socket.addEventListener('message', (ev: WebSocket.MessageEvent) => {
        this.logger.debug('WebSocket Message Received')
        let data: WebSocketEvent
        try {
          data = eventParser.parse(JSON.parse(ev.data.toString()))
        } catch (err) {
          this.logger.warn('Unusable event received %o', ev.data)
          this.logger.debug('Parser error %o', err)
          return
        }

        let id: string
        const type = data.type
        this.logger.debug('WebSocket Message is of type %s', type)
        switch (type) {
          case 'ConnectionStateChanged':
            id = data.payload.connectionRecord.id
            connectionSeen.add(id)
            break
          case 'CredentialStateChanged':
            id = data.payload.credentialRecord.id
            credentialSeen.add(id)
            break
          case 'DrpcRequestStateChanged':
            if (data.payload.drpcMessageRecord.request?.id === undefined) {
              this.logger.trace('Skipping %s event with undefined id', type)
              return
            }
            id = data.payload.drpcMessageRecord.request?.id
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

      for (const credential of await this.veritable.getCredentials()) {
        if (!credentialSeen.has(credential.id)) {
          this.emitIndexed('CredentialStateChanged', credential.id, {
            type: 'CredentialStateChanged',
            payload: { credentialRecord: credential },
          })
        }
      }

      resolve()
    })
    socket.on('ping', this.heartbeat)
    socket.addEventListener('close', this.closeHandler)

    this.socket = socket

    return returnedPromise
  }

  public stop = () => {
    this.logger.info('WebSocket connection to CloudAgent stopped')
    this.internalStatus = 'IDLE'

    if (this.socket) {
      this.socket.removeEventListener('close', this.closeHandler)
      this.socket.close()
      this.socket = undefined
      this.removeAllListeners()
      return
    }

    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId)
    }
  }

  private closeHandler = () => {
    this.logger.warn('WebSocket connection to CloudAgent closed')
    this.internalStatus = 'ERRORED'
    this.socket = undefined
    clearTimeout(this.heartbeatTimeout)
    this.closeTimeoutId = setTimeout(this.start, 10000)
  }
}
