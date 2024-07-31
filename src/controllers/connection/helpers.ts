import { ILogger } from '../../logger.js'
import { ConnectionRow } from '../../models/db/types.js'

export const checkDb = async (rows: ConnectionRow[], initialPinAttemptsRemaining: number, logger: ILogger) => {
  const [connectionCheck] = rows
  if (initialPinAttemptsRemaining > 0 && connectionCheck.pin_tries_remaining_count == 0) {
    logger.debug('Maximum number of pin attempts has been reached.')
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message:
        'Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to.',
      nextScreen: 'error',
    }
  } else if (connectionCheck.status === 'verified_us') {
    logger.debug('Pin has been verified.')

    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: 'Success',
      nextScreen: 'success',
    }
  } else if (
    connectionCheck.pin_tries_remaining_count < initialPinAttemptsRemaining ||
    (initialPinAttemptsRemaining === 0 && connectionCheck.pin_tries_remaining_count === 4)
  ) {
    logger.debug(`Pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
      nextScreen: 'form',
    }
  }
  logger.debug(`Pollig: No change in db detected.`)

  return false
}
