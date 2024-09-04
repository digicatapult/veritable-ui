import { Body, Get, Path, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import { InvalidInputError, NotFoundError } from '../../errors.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow, Where } from '../../models/db/types.js'
import { type UUID } from '../../models/strings.js'
import VeritableCloudagent, { DrpcResponse } from '../../models/veritableCloudagent.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../views/queries/requestCo2scope3.js'
import Scope3CarbonConsumptionResponseTemplates from '../../views/queries/responseCo2scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

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
      response_id: null,
      query_response: null,
      role: 'requester',
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
  @Get('/scope-3-carbon-consumption/{queryId}/response')
  public async scope3CarbonConsumptionResponse(@Path() queryId: UUID): Promise<HTML> {
    this.logger.debug('query response page requested %j', { queryId })
    const [query] = await this.db.get('query', { id: queryId })

    if (!query) {
      throw new NotFoundError(`There has been an issue retrieving the query.`)
    }

    const [connection] = await this.db.get('connection', { id: query.connection_id })
    if (!connection) {
      throw new InvalidInputError(`There has been an issue retrieving the connection.`)
    }

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: connection,
        queryId,
        quantity: query.details['quantity'],
        productId: query.details['productId'],
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
  @Get('/{queryId}/partial/{companyId}')
  public async scope3CO2Partial(
    @Path() queryId: UUID,
    @Path() companyId: UUID,
    @Query() partialQuery?: 'on'
  ): Promise<HTML> {
    this.logger.debug('partial query response requested %j', { queryId, companyId })
    const [query]: QueryRow[] = await this.db.get('query', { id: queryId })
    if (!query) throw new NotFoundError('query not found')

    const [company]: ConnectionRow[] = await this.db.get('connection', { id: companyId })
    if (!company) throw new NotFoundError('company connection not found')

    this.logger.debug('query and connection - are found %j', { company, query })
    const connections: ConnectionRow[] = await this.db.get('connection', { status: 'verified_both' })

    // due to very long names, re-assigning to a shorter variable (render)
    const render = this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage
    this.logger.info('rendering partial query %j', query.details)

    return this.html(
      render({
        ...query.details,
        company,
        queryId,
        partial: partialQuery === 'on' ? true : false,
        connections: connections.filter(({ id }: ConnectionRow) => id !== companyId),
        formStage: 'form',
      })
    )
  }

  /**
   * @param param.connectionId:UUID
   * @param query.partialSelect:'on' - if it's selected by checkbox, then it would return 'on'
   *
   * @returns - a tabe row for partial query
   */
  @SuccessResponse(200)
  @Get('/partial-select/{connectionId}/')
  public async partialSelect(@Path() connectionId: UUID, @Query() partialSelect?: 'on'): Promise<HTML> {
    this.logger.debug('partial select %s', connectionId)
    const [company]: ConnectionRow[] = await this.db.get('connection', { id: connectionId })
    if (!company) throw new NotFoundError('connection not found')

    this.logger.debug('selected: %j and will be returning an updated table row', { company })
    const checked: boolean = partialSelect === 'on' || false

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
   */
  @SuccessResponse(200)
  @Post('/scope-3-carbon-consumption/{queryId}/response')
  public async scope3CarbonConsumptionResponseSubmit(
    @Path() queryId: UUID,
    @Body()
    body: {
      companyId: UUID
      action: 'success'
      totalScope3CarbonEmissions: string
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
    const [queryRow] = await this.db.get('query', { id: queryId })
    if (!queryRow.response_id) {
      throw new InvalidInputError(`Missing queryId to respond to.`)
    }

    const query = {
      emissions: body.totalScope3CarbonEmissions,
      queryIdForResponse: queryRow.response_id,
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
      { id: queryId },
      {
        status: 'resolved',
      }
    )

    if (!result || error) {
      return await this.handleError(queryRow, connection, rpcId)
    }

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'success',
        company: connection,
      })
    )
  }

  /**
   * Retrieves the response to a query asked
   */
  @SuccessResponse(200)
  @Get('/scope-3-carbon-consumption/{queryId}/view-response')
  public async scope3CarbonConsumptionViewResponse(@Path() queryId: UUID): Promise<HTML> {
    this.logger.debug('requested to view response to a query %j', { queryId })
    const [query]: QueryRow[] = await this.db.get('query', { id: queryId })

    if (!query) {
      throw new NotFoundError(`There has been an issue retrieving the query.`)
    }
    if (query.query_response === null) {
      throw new InvalidInputError(`This query does not seem to have a response yet.`)
    }

    const [connection] = await this.db.get('connection', { id: query.connection_id })
    if (!connection) {
      throw new InvalidInputError(`There has been an issue retrieving the connection.`)
    }

    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.view({
        company_name: connection.company_name,
        quantity: query.details['quantity'],
        productId: query.details['productId'],
        emissions: query.query_response,
        ...query,
        id: query.id,
      })
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
