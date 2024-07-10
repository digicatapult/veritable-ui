import { pino } from 'pino'

import { ILogger } from '../../src/logger.js'

export const mockLogger: ILogger = pino({ level: 'silent' })
