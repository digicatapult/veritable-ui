import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'
import { ILogger, Logger } from './logger.js'
import Database from './models/db/index.js'

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}

export function resetContainer() {
  const db = container.resolve(Database)
  const logger = container.resolve<ILogger>(Logger)

  container.clearInstances()
  container.register(Database, { useValue: db })
  container.register<ILogger>(Logger, { useValue: logger })
}
