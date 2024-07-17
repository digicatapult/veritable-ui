import { Body, Get, Post, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import Database from '../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../models/db/types.js'
import { COMPANY_NUMBER } from '../../models/strings.js'
import QueriesTemplates from '../../views/queries/queries.js'
import QueryListTemplates from '../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../views/queryTypes/scope3.js'
import { HTML, HTMLController } from '../HTMLController.js'

type NewFormStage = 'companySelect' | 'form' | 'success'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'
interface Query {
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
    try {
      if (body) {
        const formStage: NewFormStage = body.action

        if (formStage !== 'success') {
          console.log(body)
          return this.html(
            this.scope3CarbonConsumptionTemplates.newScope3CarbonConsumptionFormPage(formStage, [], '', {
              companyName: '',
              companyNumber: body.companyNumber,
            })
          )
        }
        console.log('does not reach this which is good')
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
    } catch (e) {
      throw e
    }
  }
  private async insertNewQuery(
    connection_id: string,
    query_type: string,
    details: string,
    status: 'resolved' | 'pending_your_input' | 'pending_their_input' = 'pending_their_input'
  ) {
    try {
      let queryId: string = ''
      await this.db.withTransaction(async (db) => {
        const [record] = await db.insert('query', {
          connection_id: connection_id,
          query_type: query_type,
          status: status,
          details: details,
        })
        queryId = record.id
      })
      return queryId
    } catch (err) {
      throw err
    }
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
        company_name: company_name,
        query_type: query.query_type,
        updated_at: query.updated_at,
        status: query.status,
      }
    })
}
