import express from 'express'
import { Body, Get, Path, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import { Logger } from 'pino'
import { InvalidInputError } from '../../errors.js'
import { PartialQueryPayload } from '../../models/arrays.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow, type QueryType, Where } from '../../models/db/types.js'
import {
  BavRes,
  CarbonEmbodimentRes,
  drpcQueryAck,
  DrpcQueryRequest,
  DrpcQueryResponse,
  schemaToTypeMap,
  SubmitQueryRequest,
  SubmitQueryResponseRpcParams,
  submitQueryRpcParams,
} from '../../models/drpc.js'
import { UInt } from '../../models/numbers.js'
import { BIC, COMPANY_NUMBER, CountryCode, SOCRATA_NUMBER, type UUID } from '../../models/strings.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { JsonRpcError } from '../../models/veritableCloudagent/internal.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import QueryRequestTemplates from '../../views/queries/queryRequest.js'
import QueryResponseTemplates from '../../views/queries/queryResponse.js'
import { HTML, HTMLController } from '../HTMLController.js'

@injectable()
@Security('oauth2')
@Route('/queries')
@Produces('text/html')
export class QueriesController extends HTMLController {
  constructor(
    private requestTemplates: QueryRequestTemplates,
    private responseTemplates: QueryResponseTemplates,
    private queriesTemplates: QueriesTemplates,
    private queryManagementTemplates: QueryListTemplates,
    private cloudagent: VeritableCloudagent,
    private db: Database
  ) {
    super()
  }

  /**
   * Choose query page
   */
  @SuccessResponse(200)
  @Get('/choose')
  public async queries(@Query() connectionId?: UUID): Promise<HTML> {
    return this.html(this.queriesTemplates.chooseQueryPage(connectionId))
  }
  /**
   * Retrieves the queries page
   */
  @SuccessResponse(200)
  @Get('/')
  public async queryManagement(@Request() req: express.Request, @Query() search: string = ''): Promise<HTML> {
    const query: Where<'connection'> = []
    if (search !== '') {
      query.push(['company_name', 'ILIKE', `%${search}%`])
      req.log.info('retrieving data... %j', JSON.stringify(query))
    }
    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])

    const query_subset = await this.db.get('query', {}, [['updated_at', 'desc']])

    const queries = combineData(query_subset, connections)
    req.log.info('found and combined queries %j', queries)

    this.setHeader('HX-Replace-Url', search ? `/queries?search=${encodeURIComponent(search)}` : `/queries`)
    return this.html(this.queryManagementTemplates.listPage(queries, search?.toString()))
  }

  /**
   * Retrieves new query page
   */
  @SuccessResponse(200)
  @Get('/new')
  public async new(
    @Request() req: express.Request,
    @Query() type: QueryType,
    @Query() search?: string,
    @Query() connectionId?: UUID
  ): Promise<HTML> {
    if (connectionId) {
      const connection = await this.getConnection(connectionId)

      return this.html(
        this.requestTemplates.newQueryRequestPage({
          formStage: 'form',
          connection: connection,
          type,
        })
      )
    }

    const query: Where<'connection'> = []
    if (search) {
      query.push(['company_name', 'ILIKE', `%${search}%`])
      req.log.info('retrieving data... %j', JSON.stringify(query))
    }

    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    req.log.info(`${type} requested`)
    this.setHeader(
      'HX-Replace-Url',
      search ? `/queries/new?type=${type}&search=${encodeURIComponent(search)}` : `/queries/new?type=${type}`
    )

    return this.html(
      this.requestTemplates.newQueryRequestPage({
        formStage: 'companySelect',
        connections,
        search: search ?? '',
        type,
      })
    )
  }

  /**
   * Submits a new total carbon embodiment query
   */
  @SuccessResponse(200)
  @Post('/carbon-embodiment')
  public async carbonEmbodimentSubmit(
    @Request() req: express.Request,
    @Body()
    body: {
      connectionId: UUID
      productId: string
      quantity: number
    }
  ) {
    const connection = await this.verifyConnection(req.log, body.connectionId)
    const expiresTime = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // add a week to now

    return await this.handleQueryRequest(
      req.log,
      connection.id,
      null,
      {
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request/0.1',
        data: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              productId: body.productId,
              quantity: body.quantity,
            },
          },
        },
      },
      expiresTime
    )
  }

  /**
   * Submits a new bav query
   */
  @SuccessResponse(200)
  @Post('/bav')
  public async bavSubmit(
    @Request() req: express.Request,
    @Body()
    body: {
      connectionId: UUID
    }
  ) {
    const connection = await this.verifyConnection(req.log, body.connectionId)
    const expiresTime = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // add a week to now

    return await this.handleQueryRequest(
      req.log,
      connection.id,
      null,
      {
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/beneficiary_account_validation/request/0.1',
        data: {
          subjectId: {
            idType: 'bav',
          },
        },
      },
      expiresTime
    )
  }

  /**
   * Retrieves query response page
   */
  @SuccessResponse(200)
  @Get('/{queryId}/response')
  public async response(@Request() req: express.Request, @Path() queryId: UUID): Promise<HTML> {
    req.log.info('query response page requested %j', { queryId })
    const query = await this.getQuery(queryId)
    const connection = await this.getConnection(query.connection_id)

    if (query.status === 'resolved' && query.role === 'requester') {
      return this.html(
        this.responseTemplates.queryResponsePage({ formStage: 'view', connection, query, type: query.type })
      )
    }

    return this.html(
      this.responseTemplates.queryResponsePage({
        formStage: 'form',
        type: query.type,
        connection,
        query,
      })
    )
  }

  /**
   * @param param.queryId:UUID - query uuid identifier
   * @param param.companyId:UUID - connection uuid identifier
   * @param query.partialQuery:'on' - either render partial. Checkbox state for checked it will
   * add query string to the URL using the name of the input: (http://localhost:3000/form?<checkbox_name>=on)
   *
   * @returns a table of connections for partial query
   */
  @SuccessResponse(200)
  @Get('/{queryId}/partial')
  public async cO2Partial(
    @Request() req: express.Request,
    @Path() queryId: UUID,
    @Query() partialQuery?: 'on'
  ): Promise<HTML> {
    req.log.info('partial query response requested %s', queryId)
    const query = await this.getQuery(queryId)
    const connection = await this.getConnection(query.connection_id)

    const connections: ConnectionRow[] = await this.db.get('connection', { status: 'verified_both' })

    req.log.info('rendering partial query %j', query.details)

    return this.html(
      this.responseTemplates.queryResponsePage({
        connection,
        query,
        partial: partialQuery === 'on' ? true : false,
        connections: connections.filter(({ id }: ConnectionRow) => id !== query.connection_id),
        formStage: 'form',
        type: query.type,
      })
    )
  }

  /**
   * @param param.connectionId:UUID
   * @param query.partialSelect:'on' - if it's selected by checkbox, then it would add 'on' as a the query string
   * to the URL: (http://localhost:3000/form?<checkbox_name>=on)
   *
   * @returns - a table row for partial query
   */
  @SuccessResponse(200)
  @Get('/partial-select/{connectionId}')
  public async partialSelect(
    @Request() req: express.Request,
    @Path() connectionId: UUID,
    @Query() partialSelect?: 'on'
  ): Promise<HTML> {
    req.log.info('partial select %s', connectionId)
    const connection = await this.getConnection(connectionId)

    const checked: boolean = partialSelect === 'on' || false

    return this.html(
      this.responseTemplates.tableRow({
        id: connectionId,
        checked,
        company_name: connection.company_name,
        company_number: connection.company_number,
      })
    )
  }

  /**
   * Submit carbon embodiment query response page
   * @param connections - since table contains only 3 cells this data will need to be
   * devided into chunks of size 3
   */

  // TODO: check companyId is UUID or COMPANY_NUMBER | SOCRATA_NUMBER | string type
  @SuccessResponse(200)
  @Post('/{queryId}/response/carbon-embodiment')
  public async carbonEmbodimentResponseSubmit(
    @Request() req: express.Request,
    @Path() queryId: UUID,
    @Body()
    body: {
      companyId: UUID
      emissions: number
      partialQuery?: 'on'[] // TODO: remove
      partialSelect?: 'on'[] // TODO: remove
      connectionIds?: UUID[]
      productIds?: string[]
      quantities?: UInt[]
    }
  ): Promise<HTML> {
    const { companyId, emissions, partialQuery, partialSelect, ...partial } = body
    req.log.info('query page requested %j', { body })

    const connection = await this.verifyConnection(req.log, companyId)
    const queryRow = await this.getQuery(queryId)
    if (!queryRow.response_id) {
      req.log.warn('missing DRPC response_id to respond to %j', queryRow)
      throw new InvalidInputError(`Missing response_id to respond to.`)
    }

    if (!partialQuery) {
      const response: CarbonEmbodimentRes = {
        id: queryRow.response_id,
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/response/0.1',
        data: {
          subjectId: queryRow.details.subjectId,
          mass: emissions,
          unit: 'kg',
          partialResponses: [],
        },
      }
      return this.handleQueryResponse(req.log, connection, queryRow, response)
    }

    if (!partial.connectionIds || !partial.productIds || !partial.quantities) {
      throw new InvalidInputError('missing a property in the request body')
    }
    req.log.info('processing partial query %j', partial)
    const size: number = this.validatePartialQuery(partial)

    const { connectionIds, productIds, quantities } = partial
    if (connectionIds && productIds && quantities) {
      const results = await Promise.allSettled(
        new Array(size).fill({}).map((_, i) => {
          req.log.debug('submitting DRPC request to %s connection', connectionIds[i])
          // TODO: handle errors
          return this.handleQueryRequest(
            req.log,
            connectionIds[i],
            queryRow.id,
            {
              type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/total_carbon_embodiment/request/0.1',
              data: {
                subjectId: {
                  idType: 'product_and_quantity',
                  content: {
                    productId: productIds[i],
                    quantity: quantities[i],
                  },
                },
              },
            },
            queryRow.expires_at
          )
        })
      )
      const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

      if (rejected.length > 0) {
        throw new Error(`${rejected.length} Partial queries were rejected with Error: ${rejected[0]}`)
      }
    }

    await this.db.update(
      'query',
      { id: queryId },
      {
        status: 'forwarded',
        response: { mass: emissions, unit: 'kg', partialResponses: [], subjectId: queryRow.details.subjectId },
      }
    )

    return this.html(
      this.responseTemplates.queryResponsePage({
        type: 'total_carbon_embodiment',
        formStage: 'success',
        connection,
        query: queryRow,
      })
    )
  }

  /**
   * Submit bav response page
   * devided into chunks of size 3
   */
  @SuccessResponse(200)
  @Post('/{queryId}/response/bav')
  public async bavResponseSubmit(
    @Request() req: express.Request,
    @Path() queryId: UUID,
    @Body()
    body: {
      companyId: UUID
      bic: BIC
      countryCode: CountryCode
    }
  ): Promise<HTML> {
    const { companyId, bic, countryCode } = body
    req.log.info('query page requested %j', { body })

    const connection = await this.verifyConnection(req.log, companyId)
    const queryRow = await this.getQuery(queryId)
    if (!queryRow.response_id) {
      req.log.warn('missing DRPC response_id to respond to %j', queryRow)
      throw new InvalidInputError(`Missing response_id to respond to.`)
    }

    const response: BavRes = {
      id: queryRow.response_id,
      type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_types/beneficiary_account_validation/response/0.1',
      data: {
        subjectId: queryRow.details.subjectId,
        bic,
        countryCode,
      },
    }
    return this.handleQueryResponse(req.log, connection, queryRow, response)
  }

  private validatePartialQuery({ connectionIds: a, productIds: b, quantities: c }: PartialQueryPayload): number {
    if (!a || !b || !c) throw new InvalidInputError('empty arrays of data provided')
    if (a.length !== b.length || a.length !== c.length || b.length !== c.length) {
      throw new InvalidInputError('partial query validation failed, invalid data')
    }

    return a.length
  }

  private async handleQueryRequest(
    log: Logger,
    connectionId: UUID,
    parentId: UUID | null,
    params: Omit<SubmitQueryRequest['params'], 'id' | 'createdTime' | 'expiresTime'>,
    expiresTime: Date
  ) {
    const [connection]: ConnectionRow[] = await this.db.get(
      'connection',
      { id: connectionId, status: 'verified_both' },
      [['updated_at', 'desc']]
    )
    if (!connection.agent_connection_id) throw new InvalidInputError('missing agent_id from connection')

    const [query] = await this.db.insert('query', {
      connection_id: connectionId,
      type: schemaToTypeMap[params.type],
      status: 'pending_their_input',
      details: params.data,
      response_id: null,
      response: null,
      role: 'requester',
      parent_id: parentId,
      expires_at: expiresTime,
    })

    try {
      const fullParams = {
        id: query.id,
        createdTime: Math.floor(query.created_at.getTime() / 1000),
        expiresTime: Math.floor(query.expires_at.getTime() / 1000),
        ...params,
      }
      const safeParams = submitQueryRpcParams.parse(fullParams)
      await this.submitDrpcQueryAndStoreResult(log, connection.agent_connection_id, query, {
        method: 'submit_query_request',
        params: safeParams,
      })
    } catch (err) {
      if (err instanceof Error) {
        log.error('Error submitting Drpc query %s', err.message)
      } else {
        log.error('Error submitting Drpc query %j', { error: err })
      }

      await this.db.update('query', { id: query?.id }, { status: 'errored' })

      return this.html(
        this.requestTemplates.newQueryRequestPage({
          formStage: 'error',
          company: {
            companyName: connection.company_name,
          },
          type: query.type,
        })
      )
    }

    return this.html(
      this.requestTemplates.newQueryRequestPage({
        formStage: 'success',
        company: {
          companyName: connection.company_name,
        },
        type: query.type,
      })
    )
  }

  private async handleQueryResponse(
    log: Logger,
    connection: ConnectionRow,
    query: QueryRow,
    response: SubmitQueryResponseRpcParams
  ) {
    if (query.response) {
      log.warn('Attempted to respond to already completed query %j', query)
      throw new InvalidInputError(`Query with id ${query.id} has already been responded to`)
    }
    if (!query.response_id || query.role === 'requester') {
      log.warn('Cannot respond to query without a response_id %j', query)
      throw new InvalidInputError(`Query from self with id ${query.id} cannot be responded to`)
    }
    if (response === undefined) {
      log.warn('Attempt to respond to query without response %j', query)
      throw new InvalidInputError(`Must provide response to respond to query`)
    }
    if (connection.agent_connection_id === null) {
      log.error('Internal error attempting to respond to pending connection %j', { connection })
      throw new Error(`Cannot respond on connection ${connection.id} without an agent id`)
    }

    try {
      await this.submitDrpcQueryAndStoreResult(log, connection.agent_connection_id, query, {
        method: 'submit_query_response',
        params: {
          ...response,
          createdTime: Math.floor(query.created_at.getTime() / 1000),
          expiresTime: Math.floor(query.expires_at.getTime() / 1000),
        },
      })

      await this.db.update(
        'query',
        { id: query.id },
        {
          status: 'resolved',
          response: response.data,
        }
      )
    } catch (err) {
      if (err instanceof Error) {
        log.error('Error submitting Drpc query %s', err.message)
      } else {
        log.error('Error submitting Drpc query %j', { error: err })
      }

      await this.db.update('query', { id: query.id }, { status: 'errored' })

      return this.html(
        this.responseTemplates.queryResponsePage({
          formStage: 'error',
          connection,
          query,
          type: query.type,
        })
      )
    }

    return this.html(
      this.responseTemplates.queryResponsePage({
        formStage: 'success',
        connection,
        query,
        type: query.type,
      })
    )
  }

  private async submitDrpcQueryAndStoreResult(
    log: Logger,
    agentConnectionId: UUID,
    query: QueryRow,
    rpcRequest: DrpcQueryRequest
  ) {
    const rpcResponse = await this.cloudagent.submitDrpcRequest(agentConnectionId, rpcRequest.method, rpcRequest.params)

    if (!rpcResponse) throw new Error('failed to retrieve rpc response')
    log.debug('DRPC response %j', { rpcResponse, rpcRequest })
    log.info('persisting query_rpc response', rpcResponse)

    const { id: agent_rpc_id, jsonrpc: _, ...resultOrError } = rpcResponse

    await this.db.insert('query_rpc', {
      agent_rpc_id,
      query_id: query.id,
      role: 'client',
      method: rpcRequest.method,
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
      log.warn('error happened with query rpc %j', { rpcResponse })
      throw new Error(`Error occurred submitting response to query ${query.response_id}`)
    }
  }

  private async getConnection(connectionId: UUID, status?: ConnectionRow['status']): Promise<ConnectionRow> {
    const [connection] = await this.db.get(
      'connection',
      { id: connectionId, ...(status !== undefined && { status }) },
      [['updated_at', 'desc']]
    )
    if (!connection) {
      throw new InvalidInputError(`Invalid connection ${connectionId}`)
    }
    return connection
  }

  private async verifyConnection(log: Logger, connectionId: UUID): Promise<ConnectionRow> {
    const connection = await this.getConnection(connectionId, 'verified_both')
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
      log.warn('connection agent id is %s or invalid status - %s', connection.agent_connection_id, connection.status)
      throw new InvalidInputError(`Cannot query unverified connection`)
    }
    return connection
  }

  private async getQuery(queryId: UUID): Promise<QueryRow> {
    const [queryRow]: QueryRow[] = await this.db.get('query', { id: queryId })
    if (!queryRow) {
      throw new InvalidInputError(`Invalid query id.`)
    }
    return queryRow
  }
}

function combineData(query_subset: QueryRow[], connections: ConnectionRow[]) {
  const connectionMap: Map<string, string> = new Map()
  for (const connection of connections) {
    if (connection.id) {
      connectionMap.set(connection.id, connection.company_name)
    }
  }

  return query_subset
    .map((query) => {
      const company_name = connectionMap.get(query.connection_id)
      if (!company_name) {
        return undefined
      }
      return {
        id: query.id,
        company_name: company_name,
        type: query.type,
        updated_at: query.updated_at,
        status: query.status,
        role: query.role,
      }
    })
    .filter((query) => query !== undefined) // Filter out queries without a matching connection
}
