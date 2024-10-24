import { container } from 'tsyringe'

import Database from '../../src/models/db/index.js'

const db = container.resolve(Database)

export const cleanup = async () => {
  await db.delete('query', {})
  await db.delete('connection', {})
  await db.delete('settings', {})
}
