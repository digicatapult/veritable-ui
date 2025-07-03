import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'
import { tablesList } from '../../src/models/db/types.js'

const db = container.resolve(Database)

export async function cleanupDatabase() {
  tablesList.forEach(async (table) => await db.delete(table, {}))
}
