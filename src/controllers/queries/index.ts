import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import { InvalidInputError } from '../../errors.js'
import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow, Where } from '../../models/db/types.js'
import { COMPANY_NUMBER } from '../../models/strings.js'
import VeritableCloudagent, { DrpcResponse } from '../../models/veritableCloudagent.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../views/queryTypes/scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

@singleton()
@injectable()
@Security('oauth2')
@Route('/queries')
@Produces('text/html')
export class QueriesController extends HTMLController {
  constructor(
    private scope3CarbonConsumptionTemplates: Scope3CarbonConsumptionTemplates,
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
          companyNumber: COMPANY_NUMBER
          action: 'form'
        }
      | {
          companyNumber: COMPANY_NUMBER
          productId: string
          quantity: number
          action: 'success'
        }
  ) {
    const [connection] = await this.db.get(
      'connection',
      { company_number: body.companyNumber, status: 'verified_both' },
      [['updated_at', 'desc']]
    )
    if (!connection) {
      throw new InvalidInputError(`Invalid company ${body.companyNumber}`)
    }
    if (!connection.agent_connection_id || connection.status !== 'verified_both') {
      throw new InvalidInputError(`Cannot query unverified connection`)
    }

    if (body.action === 'form') {
      return this.html(
        this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage({
          formStage: 'form',
          company: {
            companyName: connection.company_name,
            companyNumber: connection.company_number,
          },
        })
      )
    }

    const query = {
      productId: body.productId,
      quantity: body.quantity,
    }
    const [queryRow] = await this.db.insert('query', {
      connection_id: connection.id,
      query_type: 'Scope 3 Carbon Consumption',
      status: 'pending_their_input',
      details: query,
    })

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
          companyNumber: body.companyNumber,
        },
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
        company_name: company_name,
        query_type: query.query_type,
        updated_at: query.updated_at,
        status: query.status,
      }
    })
}
