import Database from '../../src/models/db'

export async function withAdminEmail(db: Database) {
  await db.insert('settings', {
    setting_key: 'admin_email',
    setting_value: 'admin@testmail.com',
  })
}
