import { pino } from 'pino'
import { container } from 'tsyringe'

import { Env } from './env.js'

export const Logger = Symbol('Logger')
export type ILogger = ReturnType<typeof pino>

container.register<ILogger>(Logger, {
  useFactory: (container) => {
    const env = container.resolve(Env)
    return pino(
      {
        name: 'veritable-ui',
        timestamp: true,
        level: env.get('LOG_LEVEL'),
      },
      process.stdout
    )
  },
})
