import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { QueryRow } from '../../models/db/types.js'
import {
  drpcQueryAck,
  DrpcQueryResponse,
  schemaToTypeMap,
  submitQueryResponseRpcParams,
  SubmitQueryResponseRpcParams,
  SubmitQueryRpcParams,
  submitQueryRpcParams,
  typeToResponseSchemaMap,
} from '../../models/drpc.js'
import { UUID } from '../../models/stringTypes.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { DrpcResponse, JsonRpcError } from '../../models/veritableCloudagent/internal.js'

import { neverFail } from '../../utils/promises.js'
import VeritableCloudagentEvents, { DrpcRequest, eventData } from '../veritableCloudagentEvents.js'

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

  private async handleRequestReceived(request: DrpcRequest, agentConnectionId: UUID) {
    const method = request.method
    switch (method) {
      case 'submit_query_request':
        return await neverFail(this.handleSubmitQueryRequest({ ...request, method }, agentConnectionId))
      case 'submit_query_response':
        return await neverFail(this.handleSubmitQueryResponse({ ...request, method }, agentConnectionId))
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

  private async handleSubmitQueryRequest(
    request: DrpcRequest & { method: 'submit_query_request' },
    agentConnectionId: UUID
  ) {
    let queryId: UUID | null = null
    try {
      this.logger.info(
        'DRPC request (%s) received on connection %s of method %s',
        request.id,
        agentConnectionId,
        request.method
      )

      let params: SubmitQueryRpcParams
      try {
        params = submitQueryRpcParams.parse(request.params)
        this.logger.info('submitQueryRpcParams have been parsed %j', params)
      } catch (err) {
        this.logger.warn('Invalid parameters received for request %o', request)
        this.logger.debug(err, 'Parsing error')
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
        type: schemaToTypeMap[params.type],
        details: {
          subjectId: params.data.subjectId,
        },
        response_id: params.id, //save to send back in response
        response: null,
        role: 'responder',
        expires_at: new Date(params.expiresTime * 1000),
      })
      queryId = query.id

      const result = {
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1' as const,
      }
      await this.cloudagent.submitDrpcResponse(request.id, { result })
      await this.db.insert('query_rpc', {
        query_id: query.id,
        method: request.method,
        role: 'server',
        agent_rpc_id: request.id,
        result,
      })
    } catch (err) {
      if (err instanceof Error) {
        this.logger.warn('Error thrown whilst processing DRPC request %s', err.message)
      } else {
        this.logger.warn('Unknown error thrown whilst processing DRPC request')
        this.logger.trace(err)
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

  private async handleSubmitQueryResponse(
    request: DrpcRequest & { method: 'submit_query_response' },
    agentConnectionId: UUID
  ) {
    try {
      this.logger.info(
        'DRPC response (%s) received on connection %s of method %s',
        request.id,
        agentConnectionId,
        request.method
      )

      let params: SubmitQueryResponseRpcParams
      try {
        params = submitQueryResponseRpcParams.parse(request.params)
      } catch (err) {
        this.logger.warn('Invalid parameters received for request %o', request)
        this.logger.debug(err, 'Parsing error')
        await this.cloudagent.submitDrpcResponse(request.id, {
          error: {
            code: drpcErrorCode.INVALID_PARAMS,
            message: 'invalid params object',
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
      const [queryRow] = await this.db.get('query', { id: params.id, role: 'requester' })
      if (!queryRow) {
        this.logger.warn('Invalid queryId for drpc message %s', params.id)
        return
      }

      if (queryRow.response !== null) {
        this.logger.warn('It appears this query: %s has already been answered.', params.id)
        return
      }

      //update corresponding query
      const [query]: QueryRow[] = await this.db.update(
        'query',
        { id: params.id },
        { response: params.data, status: 'resolved' }
      )

      if (queryRow.parent_id) {
        await this.handleParentQuery(queryRow.parent_id, query)
      }

      const result = {
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1' as const,
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
        this.logger.trace(err)
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

  /**
   * Aggregates child contributions. Also, submits a new drpc request and creates a child query (partial)
   * @param id - UUID, unique identifier of parent (parent_id) query
   * @param childQuery - query that has parent_id (child)
   * @param params - properties that being transfered over drpc e.g: [query,queryIdForResponse,emissions]
   * @param rpcResponse - "let rpcResponse" - replacement
   * @returns void
   */
  private async handleParentQuery(id: UUID, childQuery: QueryRow) {
    let rpcResponse: DrpcResponse | undefined
    try {
      const [parentQuery]: QueryRow[] = await this.db.get('query', { id, role: 'responder' })
      if (!parentQuery || parentQuery.status !== 'forwarded') {
        throw new Error('parent query already has a response or not found')
      }
      if (!parentQuery.response) {
        throw new Error('parent query does not have a response from us')
      }

      const [connection] = await this.db.get('connection', { id: parentQuery.connection_id })
      if (!connection.agent_connection_id) throw new Error('missing agent_id')

      const allChilds = await this.db.get('query', { parent_id: id, role: 'requester' })
      if (!allChilds.every(({ status }) => status === 'resolved')) {
        this.logger.info('not all childs have responded. returning.')
        return
      }
      const partialResponses = allChilds.map(({ id, type, response }) => {
        if (!response || type != parentQuery.type) {
          throw new Error('Unexpected child query in resolved status without response or type not matching parent')
        }
        return {
          id,
          type: typeToResponseSchemaMap[type],
          data: response,
        }
      })
      const response = {
        ...parentQuery.response,
        partialResponses,
        subjectId: parentQuery.details.subjectId,
      }
      const params = {
        id: parentQuery.response_id as UUID,
        type: typeToResponseSchemaMap[parentQuery.type],
        data: response,
      }

      const safeParams = submitQueryResponseRpcParams.parse(params)

      // if all child responded, respond to the parent query
      rpcResponse = await this.cloudagent.submitDrpcRequest(
        connection.agent_connection_id,
        'submit_query_response',
        safeParams
      )

      if (!rpcResponse) throw new Error('DRPC has not responded')

      this.logger.info('persisting query_rpc response %j', rpcResponse)

      const { id: agent_rpc_id, jsonrpc: _, ...resultOrError } = rpcResponse
      await this.db.insert('query_rpc', {
        agent_rpc_id,
        query_id: parentQuery.id,
        role: 'client',
        method: 'submit_query_response',
        ...resultOrError,
      })

      let result: DrpcQueryResponse | null = null
      let error: JsonRpcError | null = null
      if ('result' in rpcResponse) {
        result = drpcQueryAck.parse(rpcResponse.result)
      } else {
        error = rpcResponse.error
      }

      if (!result || error) {
        this.logger.warn('error happened with query rpc %j', { rpcResponse })
        throw new Error(`Error occurred submitting response to query ${parentQuery.response_id}`)
      }

      // setting parent query as resolved
      await this.db.update(
        'query',
        { id: parentQuery.id },
        {
          response: safeParams.data,
          status: 'resolved',
        }
      )
    } catch (err) {
      if (rpcResponse?.id) {
        this.logger.warn('error in rpc response %s to query %s', rpcResponse.id, childQuery?.id)
        this.logger.debug('DRPC response %j', rpcResponse)
      }
      this.logger.warn(err, 'unexpected error occurred')
      this.logger.debug('handling %s child query failed %j', childQuery?.id, childQuery)

      await this.db.update('query', { id: childQuery.id }, { status: 'errored' })
    }
  }
}
