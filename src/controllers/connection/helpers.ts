import { InternalError } from '../../errors.js'
import { ILogger } from '../../logger.js'
import { ConnectionRow } from '../../models/db/types.js'

export const checkDb = (rows: ConnectionRow[], initialPinAttemptsRemaining: number | null, logger: ILogger) => {
  logger.trace('check(): called, %j', { rows, initialPinAttemptsRemaining, logger })
  const [connectionCheck] = rows

  if (connectionCheck.status === 'verified_us' || connectionCheck.status === 'verified_both') {
    logger.info('pin has been verified. [%s]', connectionCheck.status)

    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: 'Success',
      nextScreen: 'success' as const,
    }
  }
  if (connectionCheck.pin_tries_remaining_count === 0) {
    logger.debug('maximum number of pin attempts has been reached. Remaining attempts: [%s]', connectionCheck.pin_tries_remaining_count)
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message:
        'Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to.',
      nextScreen: 'error' as const,
    }
  }
  if (initialPinAttemptsRemaining === connectionCheck.pin_tries_remaining_count) {
    logger.info(`polling: No change in db detected.`)
    return undefined
  }
  if (initialPinAttemptsRemaining === null && connectionCheck.pin_tries_remaining_count !== null) {
    logger.info(`pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
      nextScreen: 'form' as const,
    }
  }
  if (connectionCheck.pin_tries_remaining_count === null || initialPinAttemptsRemaining === null) {
    throw new InternalError('Something went wrong.')
  }

  if (connectionCheck.pin_tries_remaining_count < initialPinAttemptsRemaining) {
    logger.info(`pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
      nextScreen: 'form' as const,
    }
  }

  logger.warn('unexpected error occured: %j', { connectionCheck })
  throw new InternalError('Pin tries remaining count has increased unexpectedly.')
}
