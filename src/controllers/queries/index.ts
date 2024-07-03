import { Get, Produces, Query, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'

import Database from '../../models/db/index.js'
import QueriesTemplates from '../../views/queries.js'
import QueryListTemplates from '../../views/queriesList.js'
import { HTML, HTMLController } from '../HTMLController.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'
interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}
type QuerySubset = {
  updated_at: Date
  connection_id: string
  status: 'resolved' | 'pending_your_input' | 'pending_their_input'
  id: string
  created_at: Date
  query_type: string
}

type Connection = {
  company_name: string
  updated_at: Date
  company_number: string
  status: 'pending' | 'unverified' | 'verified_them' | 'verified_us' | 'verified_both' | 'disconnected'
  agent_connection_id: string | null
  id: string
  created_at: Date
  connection_id?: string | undefined
}

@singleton()
@injectable()
@Security('oauth2')
@Route('/queries')
@Produces('text/html')
export class QueriesController extends HTMLController {
  constructor(
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
    const query_subset = await this.db.get('query', query, [['updated_at', 'desc']])
    const connections = await this.db.get('connection', query, [['updated_at', 'desc']])
    const queries: Query[] = combineData(query_subset, connections)

    this.setHeader('HX-Replace-Url', search ? `/queries?search=${encodeURIComponent(search)}` : `/queries`)
    return this.html(this.queryManagementTemplates.listPage(queries, search))
  }
}

function combineData(query_subset: QuerySubset[], connections: Connection[]): Query[] {
  const connectionMap: Record<string, string> = {}
  for (const connection of connections) {
    if (connection.id) {
      connectionMap[connection.id] = connection.company_name
    }
  }
  return query_subset.map((query) => {
    const company_name = connectionMap[query.connection_id] || 'Unknown'

    return {
      company_name: company_name,
      query_type: query.query_type,
      updated_at: query.updated_at,
      status: query.status,
    }
  })
}
