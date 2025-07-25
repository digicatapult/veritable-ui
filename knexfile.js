export const pgConfig = {
  client: 'pg',
  timezone: 'UTC',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'veritable-ui',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || '5432',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './src/models/db/migrations',
    tableName: 'migrations',
  },
}

const config = {
  test: pgConfig,
  development: pgConfig,
  production: {
    ...pgConfig,
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || ''),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: './build/models/db/migrations',
    },
  },
}

export default config
