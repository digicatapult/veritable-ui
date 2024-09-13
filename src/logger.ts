import { pino } from 'pino'
import { container } from 'tsyringe'

import { Env } from './env.js'

export const Logger = Symbol('Logger')
export type ILogger = ReturnType<typeof pino>

let instance: ILogger | null = null
container.register<ILogger>(Logger, {
  useFactory: (container) => {
    if (instance) {
      return instance
    }

    const env = container.resolve(Env)
    instance = pino(
      {
        name: 'veritable-ui',
        timestamp: true,
        level: env.get('LOG_LEVEL'),
      },
      process.stdout
    )
    return instance
  },
})
