import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'

import { logger, Logger, type ILogger } from './logger'
import Database from './models/db/index.js'

container.register<ILogger>(Logger, {
  useValue: logger,
})
container.register(Database, { useValue: new Database() })

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T => {
    return container.resolve<T>(controller as never)
  },
}
