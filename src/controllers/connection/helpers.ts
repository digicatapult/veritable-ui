import { InternalError } from '../../errors.js'
import { ILogger } from '../../logger.js'
import { ConnectionRow } from '../../models/db/types.js'

export const checkDb = (rows: ConnectionRow[], initialPinAttemptsRemaining: number | null, logger: ILogger) => {
  const [connectionCheck] = rows

  if (connectionCheck.status === 'verified_us' || connectionCheck.status === 'verified_both') {
    logger.debug('Pin has been verified.')

    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: 'Success',
      nextScreen: 'success' as const,
    }
  }
  if (connectionCheck.pin_tries_remaining_count === 0) {
    logger.debug('Maximum number of pin attempts has been reached.')
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message:
        'Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to.',
      nextScreen: 'error' as const,
    }
  }
  if (initialPinAttemptsRemaining === connectionCheck.pin_tries_remaining_count) {
    logger.debug(`Polling: No change in db detected.`)
    return undefined
  }
  if (initialPinAttemptsRemaining === null && connectionCheck.pin_tries_remaining_count !== null) {
    logger.debug(`Pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
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
    logger.debug(`Pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
      nextScreen: 'form' as const,
    }
  }

  throw new InternalError('Pin tries remaining count has increased unexpectedly.')
}
