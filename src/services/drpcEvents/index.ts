import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import { neverFail } from '../../utils/promises.js'
import VeritableCloudagentEvents, { DrpcRequest, eventData } from '../veritableCloudagentEvents.js'

const submitQueryRpcParams = z.discriminatedUnion('query', [
  z.object({
    query: z.literal('scope-3-by-product'),
    productId: z.string(),
    quantity: z.number().int().min(1),
  }),
])
type SubmitQueryRPCParams = z.infer<typeof submitQueryRpcParams>

const drpcErrorCode = {
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

@singleton()
@injectable()
export default class DrpcEvents {
  constructor(
    private events: VeritableCloudagentEvents,
    private cloudagent: VeritableCloudagent,
    private db: Database,
    @inject(Logger) protected logger: ILogger
  ) {}

  public start() {
    this.events.on('DrpcRequestStateChanged', this.drpcRequestStateChangeHandler)
  }

  private drpcRequestStateChangeHandler: eventData<'DrpcRequestStateChanged'> = async (event) => {
    const { request, connectionId, role, state } = event.payload.drpcMessageRecord
    if (!request) {
      this.logger.warn('Invalid DRPC request received from connection %s', connectionId)
      return
    }

    if (role === 'server' && state === 'request-received') {
      await this.handelRequestReceived(request, connectionId)
      return
    }
  }

  private async handelRequestReceived(request: DrpcRequest, agentConnectionId: string) {
    if (request.method === 'submit_query_request') {
      return await neverFail(this.handleSubmitQueryRequest(request, agentConnectionId))
    }

    return await this.handleInvalidMethod(request)
  }

  private async handleInvalidMethod(request: DrpcRequest) {
    this.logger.warn('Unknown DRPC method %s', request.method)
    await this.cloudagent.submitDrpcResponse(request.id, {
      error: {
        code: drpcErrorCode.METHOD_NOT_FOUND,
        message: `Method not supported ${request.method}`,
      },
    })
    return
  }

  private async handleSubmitQueryRequest(request: DrpcRequest, agentConnectionId: string) {
    let queryId: string | null = null
    try {
      this.logger.info(
        'DRPC request (%s) received on connection %s of method %s',
        request.id,
        agentConnectionId,
        request.method
      )

      let params: SubmitQueryRPCParams
      try {
        params = submitQueryRpcParams.parse(request.params)
      } catch (err) {
        this.logger.warn('Invalid parameters received for request %s: %o', request.id, request.params)
        await this.cloudagent.submitDrpcResponse(request.id, {
          error: {
            code: drpcErrorCode.INVALID_PARAMS,
            message: `invalid params object`,
          },
        })
        return
      }

      const [connection] = await this.db.get('connection', { agent_connection_id: agentConnectionId })
      if (!connection) {
        this.logger.warn('Invalid connection for drpc message %s', agentConnectionId)
        return
      }

      const [query] = await this.db.insert('query', {
        connection_id: connection.id,
        status: 'pending_your_input',
        query_type: 'submit_query_request',
        details: params,
      })
      queryId = query.id

      const result = {
        state: 'accepted',
      }
      await this.cloudagent.submitDrpcResponse(request.id, { result })
      await this.db.insert('query_rpc', {
        query_id: query.id,
        method: 'submit_query_request',
        role: 'server',
        agent_rpc_id: request.id,
        result,
      })
    } catch (err) {
      if (err instanceof Error) {
        this.logger.warn('Error thrown whilst processing DRPC request %s', err.message)
      } else {
        this.logger.warn('Unknown error thrown whilst processing DRPC request')
        this.logger.trace(`err: %o`, err)
      }

      if (queryId !== null) {
        await this.db.update(
          'query',
          { id: queryId },
          {
            status: 'errored',
          }
        )
      }

      await this.cloudagent.submitDrpcResponse(request.id, {
        error: {
          code: drpcErrorCode.INTERNAL_ERROR,
          message: `Internal error`,
        },
      })
    }
  }
}
