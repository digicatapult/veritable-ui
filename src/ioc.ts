import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'
import { ILogger, Logger } from './logger.js'
import { Bav, type IBav } from './models/bav.js'
import Database from './models/db/index.js'
import IpidBav from './models/ipid.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}
container.register<IBav>(Bav, {
  useValue: new IpidBav(),
})

export function resetContainer() {
  const db = container.resolve(Database)
  const logger = container.resolve<ILogger>(Logger)

  container.clearInstances()
  container.register(Database, { useValue: db })
  container.register<ILogger>(Logger, { useValue: logger })
}
