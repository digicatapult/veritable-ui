import { Body, Get, Path, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import { InvalidInputError } from '../../errors.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow, Where } from '../../models/db/types.js'
import { type UUID } from '../../models/strings.js'
import VeritableCloudagent, { DrpcResponse } from '../../models/veritableCloudagent.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionResponseTemplates from '../../views/queries/queryResponses/scope3.js'
import Scope3CarbonConsumptionTemplates from '../../views/queryTypes/scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'
interface Query {
  id: UUID
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}

@singleton()
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
    private db: Database,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/queries' })
  }

  /**
   * Retrieves the query page
   */
  @SuccessResponse(200)
  @Get('/new')
  public async queries(): Promise<HTML> {
    this.logger.debug('query page requested')

    return this.html(this.queriesTemplates.chooseQueryPage())
  }
  /**
   * Retrieves the queries page
   */
  @SuccessResponse(200)
  @Get('/')
  public async queryManagement(@Query() search?: string): Promise<HTML> {
    this.logger.debug('query management page requested')
    const query: Where<'connection'> = []
    if (search) {
      query.push(['company_name', 'ILIKE', `%${search}%`])
    }

    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    const query_subset = await this.db.get('query', {}, [['updated_at', 'desc']])

    const queries = combineData(query_subset, connections)

    this.setHeader('HX-Replace-Url', search ? `/queries?search=${encodeURIComponent(search)}` : `/queries`)
    return this.html(this.queryManagementTemplates.listPage(queries, search))
  }

  /**
   * Retrieves the query page
   */
  @SuccessResponse(200)
  @Get('/new/scope-3-carbon-consumption')
  public async scope3CarbonConsumption(@Query() search?: string): Promise<HTML> {
    const query: Where<'connection'> = []
    if (search) {
      query.push(['company_name', 'ILIKE', `%${search}%`])
    }

    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    this.logger.debug('scope-3-carbon-consumption requested')
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
      throw new InvalidInputError(`Invalid connection ${body.connectionId}`)
    }
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
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

    const localQuery = {
      productId: body.productId,
      quantity: body.quantity,
    }
    const [queryRow] = await this.db.insert('query', {
      connection_id: connection.id,
      query_type: 'Scope 3 Carbon Consumption',
      status: 'pending_their_input',
      details: localQuery,
      query_id_for_response: null,
      query_response: null,
    })
    const query = {
      productId: body.productId,
      quantity: body.quantity,
      queryIdForResponse: queryRow.id, //this is for the responder to return with the response so we know what they are responding to
    }

    let rpcResponse: DrpcResponse
    try {
      const maybeResponse = await this.cloudagent.submitDrpcRequest(
        connection.agent_connection_id,
        'submit_query_request',
        {
          query: 'Scope 3 Carbon Consumption',
          ...query,
        }
      )
      if (!maybeResponse) {
        return await this.handleError(queryRow, connection)
      }
      rpcResponse = maybeResponse
    } catch (err) {
      return await this.handleError(queryRow, connection, undefined, err)
    }
    const { result, error, id: rpcId } = rpcResponse

    await this.db.insert('query_rpc', {
      agent_rpc_id: rpcId,
      query_id: queryRow.id,
      role: 'client',
      method: 'submit_query_request',
      result,
      error,
    })

    if (!result || error) {
      return await this.handleError(queryRow, connection, rpcId)
    }

    //final stage
    return this.html(
      this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
        formStage: 'success',
        company: {
          companyName: connection.company_name,
          companyNumber: connection.company_number,
        },
      })
    )
  }

  /**
   * Retrieves the query response page
   */
  @SuccessResponse(200)
  @Get('/scope-3-carbon-consumption-response/{queryId}')
  public async scope3CarbonConsumptionResponse(@Path() queryId: UUID): Promise<HTML> {
    this.logger.debug('query page requested')
    //retrieve query
    const queries = await this.db.get('query', { id: queryId })
    if (queries.length < 1) {
      throw new Error(`There has been an issue retrieving the query.`)
    }
    const query = queries[0]
    const connections = await this.db.get('connection', { id: query.connection_id })
    if (connections.length < 1) {
      throw new Error(`There has been an issue retrieving the connection.`)
    }
    const connection = connections[0]
    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage(
        'form',
        connection,
        queryId,
        query.details['quantity'],
        query.details['productId']
      )
    )
  }

  /**
   * Submits the query response page
   */
  @SuccessResponse(200)
  @Post('/scope-3-carbon-consumption-response/submit')
  public async scope3CarbonConsumptionResponseSubmit(
    @Body()
    body: {
      companyId: UUID
      queryId: UUID
      action: 'success'
      totalScope3CarbonEmissions: string
      partialResponse?: number
    }
  ): Promise<HTML> {
    this.logger.debug('query page requested')

    const [connection] = await this.db.get('connection', { id: body.companyId, status: 'verified_both' }, [
      ['updated_at', 'desc'],
    ])
    if (!connection) {
      throw new InvalidInputError(`Invalid connection ${body.companyId}`)
    }
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
      throw new InvalidInputError(`Cannot query unverified connection`)
    }
    const [queryRow] = await this.db.get('query', { id: body.queryId })
    if (!queryRow.query_id_for_response) {
      throw new InvalidInputError(`Missing queryId to respond to.`)
    }
    const query = {
      productId: queryRow.details['productId'],
      quantity: queryRow.details['quantity'],
      emissions: body.totalScope3CarbonEmissions,
      queryIdForResponse: queryRow.query_id_for_response,
    }
    //send a drpc message with response
    let rpcResponse: DrpcResponse
    try {
      const maybeResponse = await this.cloudagent.submitDrpcRequest(
        connection.agent_connection_id,
        'submit_query_response',
        {
          query: 'Scope 3 Carbon Consumption',
          ...query,
        }
      )
      if (!maybeResponse) {
        return await this.handleError(queryRow, connection)
      }
      rpcResponse = maybeResponse
    } catch (err) {
      return await this.handleError(queryRow, connection, undefined, err)
    }
    const { result, error, id: rpcId } = rpcResponse

    await this.db.insert('query_rpc', {
      agent_rpc_id: rpcId,
      query_id: queryRow.id,
      role: 'client', // am I still a client when I'm a 'responder'?
      method: 'submit_query_request',
      result,
      error,
    })
    await this.db.update(
      'query',
      { id: body.queryId },
      {
        status: 'resolved',
      }
    )

    if (!result || error) {
      return await this.handleError(queryRow, connection, rpcId)
    }

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage('success', connection)
    )
  }

  private async handleError(query: QueryRow, connection: ConnectionRow, rpcId?: string, error?: unknown) {
    if (rpcId) {
      this.logger.warn('Error in rpc response %s to query %s to connection %s', rpcId, query.id, connection.id)
    } else {
      this.logger.warn('Error submitting query %s to connection %s', query.id, connection.id)
    }
    if (error instanceof Error) {
      this.logger.debug('Message: %s', error.message)
      this.logger.trace('Stack: %o', error.stack)
    } else {
      this.logger.debug('Error: %o', error)
    }

    await this.db.update('query', { id: query.id }, { status: 'errored' })
    return this.html(
      this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
        formStage: 'error',
        company: {
          companyName: connection.company_name,
          companyNumber: connection.company_number,
        },
      })
    )
  }
}

function combineData(query_subset: QueryRow[], connections: ConnectionRow[]) {
  const connectionMap: Record<string, string> = {}
  for (const connection of connections) {
    if (connection.id) {
      connectionMap[connection.id] = connection.company_name
    }
  }

  return query_subset
    .filter((query) => connectionMap.hasOwnProperty(query.connection_id)) // Filter out queries without a matching connection
    .map((query) => {
      const company_name = connectionMap[query.connection_id]

      return {
        id: query.id,
        company_name: company_name,
        query_type: query.query_type,
        updated_at: query.updated_at,
        status: query.status,
      }
    })
}
