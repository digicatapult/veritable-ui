import knex from 'knex'
import { container, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../../env/index.js'
import { DatabaseTimeoutError } from '../../errors.js'
import Zod, { ColumnsByType, IDatabase, Models, Order, TABLE, Update, Where, tablesList } from './types.js'
import { reduceWhere } from './util.js'

const env = container.resolve(Env)
const clientSingleton = knex({
  client: 'pg',
  connection: {
    host: env.get('DB_HOST'),
    database: env.get('DB_NAME'),
    user: env.get('DB_USERNAME'),
    password: env.get('DB_PASSWORD'),
    port: env.get('DB_PORT'),
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
})

@singleton()
export default class Database {
  private db: IDatabase

  constructor(private client = clientSingleton) {
    const models: IDatabase = tablesList.reduce((acc, name) => {
      return {
        [name]: () => this.client(name),
        ...acc,
      }
    }, {}) as IDatabase
    this.db = models
  }

  // backlog item for if statement model === logic has been added and returns etc
  insert = async <M extends TABLE>(
    model: M,
    record: Models[typeof model]['insert']
  ): Promise<Models[typeof model]['get'][]> => {
    return z
      .array(Zod[model].get)
      .parse(await this.db[model]().insert(record).returning('*')) as Models[typeof model]['get'][]
  }

  delete = async <M extends TABLE>(model: M, where: Where<M>): Promise<void> => {
    return this.db[model]()
      .where(where || {})
      .delete()
  }

  update = async <M extends TABLE>(
    model: M,
    where: Where<M>,
    updates: Update<M>
  ): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]().update({
      ...updates,
      updated_at: this.client.fn.now(),
    })
    query = reduceWhere(query, where)

    return z.array(Zod[model].get).parse(await query.returning('*')) as Models[typeof model]['get'][]
  }

  increment = async <M extends TABLE>(
    model: M,
    column: ColumnsByType<M, number>,
    where?: Where<M>,
    amount: number = 1
  ): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]()
    query = reduceWhere(query, where)
    query = query.increment(column, amount)
    return z.array(Zod[model].get).parse(await query.returning('*')) as Models[typeof model]['get'][]
  }

  get = async <M extends TABLE>(
    model: M,
    where?: Where<M>,
    order?: Order<M>,
    limit?: number
  ): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]()
    query = reduceWhere(query, where)
    if (order && order.length !== 0) {
      query = order.reduce((acc, [key, direction]) => acc.orderBy(key, direction), query)
    }
    if (limit !== undefined) query = query.limit(limit)
    const result = await query
    return z.array(Zod[model].get).parse(result) as Models[typeof model]['get'][]
  }

  waitForCondition = async <M extends TABLE>(
    model: M,
    checkCondition: (rows: Models[typeof model]['get'][]) => boolean,
    where?: Where<M>,
    timeout?: number
  ): Promise<Models[typeof model]['get'][]> => {
    const startTime = Date.now()
    const timeoutMs = timeout ?? 4000 // 4 seconds
    const interval = 100 // 100 ms

    while (Date.now() - startTime < timeoutMs) {
      const rows = await this.get(model, where)
      if (checkCondition(rows)) {
        return rows
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new DatabaseTimeoutError(`Sorry, there has been an error polling the database, table ${model}`)
  }

  withTransaction = (update: (db: Database) => Promise<void>) => {
    return this.client.transaction(async (trx) => {
      const decorated = new Database(trx)
      await update(decorated)
    })
  }
}

container.register(Database, { useValue: new Database() })
