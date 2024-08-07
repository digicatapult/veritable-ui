import { Body, Get, Path, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../models/db/types.js'
import type { COMPANY_NUMBER, UUID } from '../../models/strings.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionResponseTemplates from '../../views/queries/queryResponses/scope3.js'
import Scope3CarbonConsumptionTemplates from '../../views/queryTypes/scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

type NewFormStage = 'companySelect' | 'form' | 'success'

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
    private db: Database,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
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
    const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    const query_subset = await this.db.get('query', {}, [['updated_at', 'desc']])

    const queries: Query[] = combineData(query_subset, connections)

    this.setHeader('HX-Replace-Url', search ? `/queries?search=${encodeURIComponent(search)}` : `/queries`)
    return this.html(this.queryManagementTemplates.listPage(queries, search))
  }

  /**
   * Retrieves the query page
   */
  @SuccessResponse(200)
  @Get('/new/scope-3-carbon-consumption')
  public async scope3CarbonConsumption(@Query() search?: string): Promise<HTML> {
    const query = search ? [['company_name', 'ILIKE', `%${search}%`]] : {}
    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    this.logger.debug('scope-3-carbon-consumption requested')
    this.setHeader(
      'HX-Replace-Url',
      search
        ? `/queries/new/scope-3-carbon-consumption?search=${encodeURIComponent(search)}`
        : `/queries/new/scope-3-carbon-consumption`
    )

    return this.html(
      this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage('companySelect', connections, search, {
        companyName: '',
        companyNumber: '',
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
    body: {
      companyNumber: COMPANY_NUMBER
      companyName?: string
      productId?: string
      quantity?: number
      action: 'companySelect' | 'form' | 'success'
    }
  ) {
    const formStage: NewFormStage = body.action

    if (formStage !== 'success') {
      return this.html(
        this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage(formStage, [], '', {
          companyName: '',
          companyNumber: body.companyNumber,
        })
      )
    }
    const company = await this.db.get(
      'connection',
      [['company_number', 'ILIKE', `%${body.companyNumber}%`]],
      [['updated_at', 'desc']]
    )

    if (!body.productId || !body.quantity) {
      throw new Error('ProductId or quantity is missing.')
    }
    const newQueryId = await this.insertNewQuery(
      company[0].id,
      'Scope 3 Carbon Consumption',
      `{ "productId": "${body.productId}", "quantity": "${body.quantity}" }`
    )
    if (!newQueryId) {
      throw new Error('Query isertion was unsuccessful.')
    }
    //final stage
    return this.html(
      this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage(formStage, [], '', {
        companyName: company[0].company_name,
        companyNumber: body.companyNumber,
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
        {
          companyName: connection.company_name,
          companyNumber: connection.company_number,
        },
        2, //hardcoded - should come from query description
        '05867ccc' //hardcoded - should come from query description
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
      companyNumber: COMPANY_NUMBER
      companyName: string
      productId?: string
      quantity?: number
      action: 'form' | 'success'
      totalScope3CarbonEmissions: string
      partialResponse?: number
    }
  ): Promise<HTML> {
    this.logger.debug('query page requested')
    //send a drpc message with response
    return this.html(
      this.scope3CarbonConsumptionResponseTemplates.newScope3CarbonConsumptionResponseFormPage('success', {
        companyName: body.companyName,
        companyNumber: body.companyNumber,
      })
    )
  }

  private async insertNewQuery(
    connection_id: string,
    query_type: string,
    details: string,
    status: 'resolved' | 'pending_your_input' | 'pending_their_input' = 'pending_their_input'
  ) {
    let queryId: string = ''

    const [record] = await this.db.insert('query', {
      connection_id: connection_id,
      query_type: query_type,
      status: status,
      details: details,
    })
    queryId = record.id

    return queryId
  }
}

function combineData(query_subset: QueryRow[], connections: ConnectionRow[]): Query[] {
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
