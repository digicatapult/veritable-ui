import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../models/db/types.js'
import { UUID } from '../../models/strings.js'
import VeritableCloudagent, { DrpcResponse } from '../../models/veritableCloudagent.js'
import { neverFail } from '../../utils/promises.js'
import VeritableCloudagentEvents, { DrpcRequest, eventData } from '../veritableCloudagentEvents.js'

const submitQueryRpcParams = z.discriminatedUnion('query', [
  z.object({
    query: z.literal('Scope 3 Carbon Consumption'),
    productId: z.string(),
    quantity: z.number().int().min(1),
    queryIdForResponse: z.string(),
    emissions: z.string().optional(),
  }),
])
const submitQueryResponseRpcParams = z.discriminatedUnion('query', [
  z.object({
    query: z.literal('Scope 3 Carbon Consumption'),
    queryIdForResponse: z.string(),
    emissions: z.string().optional(),
  }),
])
type SubmitQueryRPCParams = z.infer<typeof submitQueryRpcParams>
type SubmitQueryResponseRPCParams = z.infer<typeof submitQueryResponseRpcParams>

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
      await this.handleRequestReceived(request, connectionId)
      return
    }
  }

  private async handleRequestReceived(request: DrpcRequest, agentConnectionId: string) {
    switch (request.method) {
      case 'submit_query_request':
        return await neverFail(this.handleSubmitQueryRequest(request, agentConnectionId))
      case 'submit_query_response':
        return await neverFail(this.handleSubmitQueryResponse(request, agentConnectionId))
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
        this.logger.info('submitQueryRpcParams have been parsed %j', params)
      } catch (err) {
        this.logger.warn('Invalid parameters received for request %s: %j', request.id, request.params)
        this.logger.debug('Parsing error j%', err)
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
        query_type: 'Scope 3 Carbon Consumption',
        details: {
          productId: params.productId,
          quantity: params.quantity,
        },
        response_id: params.queryIdForResponse, //save to send back in response
        query_response: null,
        role: 'responder',
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

  private async handleSubmitQueryResponse(request: DrpcRequest, agentConnectionId: string) {
    try {
      this.logger.info(
        'DRPC response (%s) received on connection %s of method %s',
        request.id,
        agentConnectionId,
        request.method
      )

      let params: SubmitQueryResponseRPCParams
      try {
        params = submitQueryResponseRpcParams.parse(request.params)
      } catch (err) {
        this.logger.warn('Invalid parameters received for request %s: %o', request.id, request.params)
        this.logger.debug('Parsing error o%', err)
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
      //find corresponding query based on queryIdForResponse provided by responder,
      //this should match a query id in our db
      const [queryRow] = await this.db.get('query', { id: params.queryIdForResponse, role: 'requester' })
      if (!queryRow) {
        this.logger.warn('Invalid queryId for drpc message %s', params.queryIdForResponse)
        return
      }

      if (queryRow.query_response !== null) {
        this.logger.warn('It appears this query: %s has already been answered.', params.queryIdForResponse)
        return
      }

      //update corresponding query
      const [query]: QueryRow[] = await this.db.update(
        'query',
        { id: queryRow.id },
        { query_response: params.emissions, status: 'resolved' }
      )

      if (queryRow.parent_id) {
        await this.handleParentQuery(queryRow.parent_id, queryRow, params)
      }

      const result = {
        state: 'accepted',
      }

      await this.cloudagent.submitDrpcResponse(request.id, { result })
      await this.db.insert('query_rpc', {
        query_id: query.id,
        method: 'submit_query_response',
        role: 'server',
        agent_rpc_id: request.id,
        result,
      })
      this.logger.info('DRPC response has been successfully handled %j', query)
    } catch (err) {
      if (err instanceof Error) {
        this.logger.warn('Error thrown whilst processing DRPC request %s', err.message)
      } else {
        this.logger.warn('Unknown error thrown whilst processing DRPC request')
        this.logger.trace(`err: %o`, err)
      }

      // fire and forget? I think something we could handle at the errorsHandler (the global one)
      await this.cloudagent.submitDrpcResponse(request.id, {
        error: {
          code: drpcErrorCode.INTERNAL_ERROR,
          message: `Internal error`,
        },
      })
    }
  }

  private async handleParentQuery(id: UUID, childQuery: QueryRow, params: SubmitQueryResponseRPCParams) {
    const [parentQuery]: QueryRow[] = await this.db.get('query', { id })
    if (!parentQuery) {
      this.logger.warn('parent query not found', id)
      return
    }

    if (parentQuery.query_response !== null) {
      this.logger.warn('query already has a response %j', parentQuery)
      return
    }

    // adding childs and parent emissions
    const total: number = parseInt(childQuery.details.emissions) + parseInt(params.emissions || '0')
    await this.db.update(
      'query',
      { id },
      {
        status: 'resolved',
        details: {
          ...parentQuery.details,
          emissions: total.toString(),
        },
      }
    )

    const [connection] = await this.db.get('connection', { id: parentQuery.connection_id })
    if (!connection.agent_connection_id) return this.handleError(childQuery, connection)

    let rpcResponse: DrpcResponse
    try {
      const maybeResponse = await this.cloudagent.submitDrpcRequest(
        connection.agent_connection_id,
        'submit_query_response',
        {
          query: 'Scope 3 Carbon Consumption',
          emissions: total.toString(),
          queryIdForResponse: parentQuery.response_id as UUID,
        }
      )
      this.logger.info('submitting DRPC request %j', maybeResponse)
      if (!maybeResponse) {
        this.logger.warn('no response')
        return this.handleError(childQuery, connection)
      }
      rpcResponse = maybeResponse
    } catch (err) {
      this.logger.warn('DRPC has failed %j', err)
      return this.handleError(childQuery, connection)
    }
    const { result, error, id: rpcId } = rpcResponse

    this.logger.info('persisting query_rpc response %j', rpcResponse)
    await this.db.insert('query_rpc', {
      agent_rpc_id: rpcId,
      query_id: parentQuery.id,
      role: 'client',
      method: 'submit_query_request',
      result,
      error,
    })

    if (!result || error) {
      this.logger.warn('error happened while persisting query_rpc %j', error)
      return this.handleError(childQuery, connection, rpcId, error)
    }

    await this.db.update('query', { id: parentQuery.id }, { query_response: total.toString(), status: 'resolved' })
  }

  private async handleError(query: QueryRow, connection: ConnectionRow, rpcId?: string, error?: unknown) {
    if (rpcId) {
      this.logger.warn('error in rpc response %s to query %s to connection %s', rpcId, query.id, connection.id)
    } else {
      this.logger.warn('error submitting query %s to connection %s', query.id, connection.id)
    }
    if (error instanceof Error) {
      this.logger.debug('message: %s', error.message)
      this.logger.trace('stack: %o', error.stack)
    } else {
      this.logger.debug('error: %o', error)
    }

    await this.db.update('query', { id: query.id }, { status: 'errored' })
  }
}
