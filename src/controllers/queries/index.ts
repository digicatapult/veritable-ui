import express from 'express'
import { Body, Get, Path, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import { Logger } from 'pino'
import { InvalidInputError, NotFoundError } from '../../errors.js'
import { PartialQueryPayload } from '../../models/arrays.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow, Where } from '../../models/db/types.js'
import { type UUID } from '../../models/strings.js'
import VeritableCloudagent, { DrpcResponse } from '../../models/veritableCloudagent.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../views/queries/requestCo2scope3.js'
import Scope3CarbonConsumptionResponseTemplates from '../../views/queries/responseCo2scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

@injectable()
@Security('oauth2')
@Route('/queries')
@Produces('text/html')
export class QueriesController extends HTMLController {
  constructor(
    private scope3CarbonConsumptionTemplates: Scope3CarbonConsumptionTemplates,
    private scope3CarbonConsumptionResponseTemplates: Scope3CarbonConsumptionResponseTemplates,
    private queriesTemplates: QueriesTemplates,
    private queryManagementTemplates: QueryListTemplates,
    private cloudagent: VeritableCloudagent,
    private db: Database
  ) {
    super()
  }

  /**
   * Retrieves the query page
   */
  @SuccessResponse(200)
  @Get('/new')
  public async queries(): Promise<HTML> {
    return this.html(this.queriesTemplates.chooseQueryPage())
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
   * Retrieves the query page
   */
  @SuccessResponse(200)
  @Get('/new/scope-3-carbon-consumption')
  public async scope3CarbonConsumption(@Request() req: express.Request, @Query() search?: string): Promise<HTML> {
    const query: Where<'connection'> = []
    if (search) {
      query.push(['company_name', 'ILIKE', `%${search}%`])
      req.log.info('retrieving data... %j', JSON.stringify(query))
    }

    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    req.log.info('scope-3-carbon-consumption requested')
    this.setHeader(
      'HX-Replace-Url',
      search
        ? `/queries/new/scope-3-carbon-consumption?search=${encodeURIComponent(search)}`
        : `/queries/new/scope-3-carbon-consumption`
    )

    return this.html(
      this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
        formStage: 'companySelect',
        connections,
        search: search ?? '',
      })
    )
  }

  /**
   * Retrieves the stage page
   */
  @SuccessResponse(200)
  @Post('/new/scope-3-carbon-consumption/stage')
  public async scope3CarbonConsumptionStage(
    @Request() req: express.Request,
    @Body()
    body:
      | {
          connectionId: UUID
          action: 'form'
        }
      | {
          connectionId: UUID
          productId: string
          quantity: number
          action: 'success'
        }
  ) {
    const [connection] = await this.db.get('connection', { id: body.connectionId, status: 'verified_both' }, [
      ['updated_at', 'desc'],
    ])
    if (!connection) {
      req.log.warn('connection [%s] is not found', body.connectionId)
      throw new InvalidInputError(`Invalid connection ${body.connectionId}`)
    }
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
      req.log.warn(
        'connection agent id is %s or invalid status - %s',
        connection.agent_connection_id,
        connection.status
      )
      throw new InvalidInputError(`Cannot query unverified connection`)
    }

    if (body.action === 'form') {
      return this.html(
        this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
          formStage: 'form',
          connectionId: body.connectionId,
        })
      )
    }

    const [queryRow] = await this.db.insert('query', {
      connection_id: connection.id,
      query_type: 'Scope 3 Carbon Consumption',
      status: 'pending_their_input',
      details: {
        productId: body.productId,
        quantity: body.quantity,
      },
      response_id: null,
      query_response: null,
      role: 'requester',
    })
    req.log.info('local query has been persisted %j', queryRow)

    return this.submitDrpcRequest({
      method: 'submit_query_request',
      log: req.log,
      connection,
      query: queryRow,
      localQuery: {
        query: 'Scope 3 Carbon Consumption',
        productId: body.productId,
        quantity: body.quantity,
        queryIdForResponse: queryRow.id,
      },
    })
  }

  /**
   * Retrieves the query response page
   */
  @SuccessResponse(200)
  @Get('/scope-3-carbon-consumption/{queryId}/response')
  public async scope3CarbonConsumptionResponse(@Request() req: express.Request, @Path() queryId: UUID): Promise<HTML> {
    req.log.info('query response page requested %j', { queryId })
    const [query] = await this.db.get('query', { id: queryId })

    if (!query) {
      req.log.warn('query [%s] was not found', queryId)
      throw new NotFoundError(`There has been an issue retrieving the query.`)
    }

    const [connection] = await this.db.get('connection', { id: query.connection_id })
    if (!connection) {
      req.log.warn('connection using query.connection_id [%s] was not found', query.connection_id)
      throw new InvalidInputError(`There has been an issue retrieving the connection.`)
    }

    req.log.info('rendering co2 scope3 form %j', connection)

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: connection,
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
  public async scope3CO2Partial(
    @Request() req: express.Request,
    @Path() queryId: UUID,
    @Query() partialQuery?: 'on'
  ): Promise<HTML> {
    req.log.info('partial query response requested %s', queryId)
    const [query]: QueryRow[] = await this.db.get('query', { id: queryId })
    if (!query) throw new NotFoundError('query not found')

    const [company]: ConnectionRow[] = await this.db.get('connection', { id: query.connection_id })
    if (!company) throw new NotFoundError('company connection not found')

    req.log.info('query and connection - are found %j', { company, query })
    const connections: ConnectionRow[] = await this.db.get('connection', { status: 'verified_both' })

    // due to very long names, re-assigning to a shorter variable (render)
    const render = this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage
    req.log.info('rendering partial query %j', query.details)

    return this.html(
      render({
        company,
        query,
        partial: partialQuery === 'on' ? true : false,
        connections: connections.filter(({ id }: ConnectionRow) => id !== query.connection_id),
        formStage: 'form',
      })
    )
  }

  /**
   * @param param.connectionId:UUID
   * @param query.partialSelect:'on' - if it's selected by checkbox, then it would add 'on' as a the query string
   * to the URL: (http://localhost:3000/form?<checkbox_name>=on)
   *
   * @returns - a tabe row for partial query
   */
  @SuccessResponse(200)
  @Get('/partial-select/{connectionId}')
  public async partialSelect(
    @Request() req: express.Request,
    @Path() connectionId: UUID,
    @Query() partialSelect?: 'on'
  ): Promise<HTML> {
    req.log.info('partial select %s', connectionId)
    const [company]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })
    if (!company) throw new NotFoundError('connection not found')

    const checked: boolean = partialSelect === 'on' || false
    req.log.info('selected: %s returning an updated table row %j', connectionId, company)

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.tableRow({
        id: connectionId,
        checked,
        company_name: company.company_name,
        company_number: company.company_number,
      })
    )
  }

  /**
   * Submits the query response page
   * @param connections - since table contains only 3 cells this data will need to be
   * devided into chunks of size 3
   */
  @SuccessResponse(200)
  @Post('/scope-3-carbon-consumption/{queryId}/response')
  public async scope3CarbonConsumptionResponseSubmit(
    @Request() req: express.Request,
    @Path() queryId: UUID,
    @Body()
    body: {
      companyId: UUID
      action: 'success'
      emissions?: string
      partialQuery?: 'on'[]
      partialSelect?: 'on'[]
      connectionIds?: string[]
      productIds?: string[]
      quantities?: string[]
    }
  ): Promise<HTML> {
    const { action, companyId, emissions, partialQuery, partialSelect, ...partial } = body
    req.log.info('query page requested %j', { body })

    const [connection]: ConnectionRow[] = await this.db.get('connection', { id: companyId, status: 'verified_both' }, [
      ['updated_at', 'desc'],
    ])
    if (!connection) {
      req.log.warn('invalid input error %j', { companyId, action })
      throw new InvalidInputError(`Invalid connection ${companyId}`)
    }
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
      req.log.warn('invalid input error %j', { companyId, action, emissions })
      throw new InvalidInputError(`Cannot query unverified connection`)
    }
    const [queryRow]: QueryRow[] = await this.db.get('query', { id: queryId })
    if (!queryRow.response_id) {
      req.log.warn('missing DRPC response_id to respond to %j', queryRow)
      throw new InvalidInputError(`Missing response_id to respond to.`)
    }

    if (partial && partialQuery) {
      if (!partial.connectionIds || !partial.productIds || !partial.quantities) {
        throw new InvalidInputError('missing a property in the request body')
      }
      req.log.info('processing partial query %j', partial)
      const size: number = this.validatePartialQuery(partial)

      await Promise.all(
        new Array(size).fill({}).map((_, i) => {
          if (partial.connectionIds && partial.productIds && partial.quantities) {
            req.log.debug('submitting DRPC request to %s connection', partial.connectionIds[i])

            return this.submitDrpcRequest({
              parentId: queryRow.id,
              method: 'submit_query_request',
              connectionId: partial.connectionIds[i],
              log: req.log,
              localQuery: {
                query: 'Scope 3 Carbon Consumption',
                quantity: parseInt(partial.quantities[i]),
                productId: partial.productIds[i],
                emissions,
              },
              query: null,
              connection: null,
            })
          }
        })
      )

      return this.html(
        this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage({
          formStage: 'success',
          company: connection,
          query: queryRow,
        })
      )
    }

    return this.submitDrpcRequest({
      connection,
      method: 'submit_query_response',
      log: req.log,
      localQuery: {
        query: 'Scope 3 Carbon Consumption',
        emissions,
        queryIdForResponse: queryRow.response_id,
      },
      query: queryRow,
    })
  }

  /**
   * Retrieves the response to a query asked
   */
  @SuccessResponse(200)
  @Get('/scope-3-carbon-consumption/{queryId}/view-response')
  public async scope3CarbonConsumptionViewResponse(
    @Request() req: express.Request,
    @Path() queryId: UUID
  ): Promise<HTML> {
    req.log.debug('gathering data for [%s] query response page', queryId)
    const [query]: QueryRow[] = await this.db.get('query', { id: queryId })

    if (!query) throw new NotFoundError(`There has been an issue retrieving the query.`)
    if (query.query_response === null) throw new InvalidInputError(`This query does not seem to have a response yet.`)

    const [connection] = await this.db.get('connection', { id: query.connection_id })
    if (!connection) {
      req.log.warn('invalid input, unable to retrieve a %s connection', query.connection_id)
      throw new InvalidInputError(`There has been an issue retrieving the connection.`)
    }

    req.log.info('connection and query has been found %j', { query, connection })

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.view({
        company_name: connection.company_name,
        quantity: query.details['quantity'],
        productId: query.details['productId'],
        emissions: query.query_response,
        ...query,
      })
    )
  }

  private validatePartialQuery({ connectionIds: a, productIds: b, quantities: c }: PartialQueryPayload): number {
    if (!a || !b || !c) throw new InvalidInputError('empty arrays of data provided')
    if (a.length !== b.length || a.length !== c.length || b.length !== c.length) {
      throw new InvalidInputError('partial query validation failed, invalid data')
    }

    return a.length
  }

  /**
   *
   * @param rpcResponse
   * @param log - logger, passed so we can keep track of req_id
   * @param method - either receive or sent needed for submitting drpc request
   * @param payload - rest(spread operator) that will contain
   * @returns html either success of error
   */
  public async submitDrpcRequest({
    rpcResponse,
    log,
    method,
    ...payload
  }: {
    query: QueryRow | null
    method: 'submit_query_request' | 'submit_query_response'
    log: Logger
    localQuery: { query: string; queryIdForResponse?: UUID; emissions?: string; quantity?: number; productId?: string }
    rpcResponse?: DrpcResponse | undefined
    parentId?: UUID | undefined
    connectionId?: UUID
    connection?: ConnectionRow | null
  }) {
    try {
      const { parentId, connection, localQuery, connectionId } = payload
      const [conn]: ConnectionRow[] = connection
        ? [connection]
        : await this.db.get('connection', { id: connectionId, status: 'verified_both' }, [['updated_at', 'desc']])

      if (!conn.agent_connection_id) throw new InvalidInputError('missing agent_id from connection')
      if (parentId) {
        const [query] = await this.db.insert('query', {
          connection_id: conn.id,
          parent_id: parentId,
          query_type: 'Scope 3 Carbon Consumption',
          status: 'pending_their_input',
          details: localQuery,
          response_id: null,
          query_response: null,
          role: 'requester',
        })
        if (!payload.query) payload.query = query

        await this.db.update('query', { id: parentId }, { status: 'forwarded' })
        log.info('child query has been created %s that is fowarded from %s parent query', query.id, parentId)
        log.debug('before submision of DRPC request %j', { payload, query, connection: conn })
        localQuery.queryIdForResponse = query.id
      }
      const { query } = payload

      if (!query || query.query_response != null) throw new Error('query already has a response')
      rpcResponse = await this.cloudagent.submitDrpcRequest(conn.agent_connection_id, method, localQuery)

      if (!rpcResponse) throw new Error('failed to retrieve rpc response')
      log.debug('DRPC response %j', { rpcResponse, localQuery })
      log.info('persisting query_rpc response', rpcResponse)

      await this.db.insert('query_rpc', {
        agent_rpc_id: rpcResponse.id,
        query_id: query.id,
        role: 'client',
        method: 'submit_query_request',
        result: rpcResponse.result,
        error: rpcResponse.error,
      })

      if (!rpcResponse.result || rpcResponse.error) {
        log.warn('error happened while persisting query_rpc %j', rpcResponse.error)
        throw new Error(JSON.stringify(rpcResponse.error))
      }

      if (!parentId && localQuery.emissions) {
        await this.db.update('query', { id: query.id }, { query_response: localQuery.emissions, status: 'resolved' })
      }

      return this.html(
        this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage({
          formStage: 'success',
          company: conn,
          query,
        })
      )
    } catch (err) {
      const { query, connection } = payload
      if (rpcResponse?.id) {
        log.warn('error in rpc response %s to query %s to connection %s', rpcResponse.id, query?.id, connection?.id)
        log.debug('DRPC response %j', rpcResponse)
      }
      log.warn('unexpected error occured', JSON.stringify(err))
      log.debug('query %s has errored for %s connection %j', query?.id, connection?.id, { query, connection })

      await this.db.update('query', { id: query?.id }, { status: 'errored' })

      return this.html(
        this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
          formStage: 'error',
          company: {
            companyName: connection?.company_name,
            companyNumber: connection?.company_number || '',
          },
        })
      )
    }
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
        query_type: query.query_type,
        updated_at: query.updated_at,
        status: query.status,
        role: query.role,
      }
    })
    .filter((query) => query !== undefined) // Filter out queries without a matching connection
}
