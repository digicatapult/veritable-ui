import { ILogger } from '../../logger.js'
import { ConnectionRow } from '../../models/db/types.js'

export const checkDb = (rows: ConnectionRow[], initialPinAttemptsRemaining: number | null, logger: ILogger) => {
  const [connectionCheck] = rows

  if (connectionCheck.status === 'verified_us') {
    logger.debug('Pin has been verified.')

    return {
      localPinAttempts: connectionCheck.pin_tries_remaining_count,
      message: 'Success',
      nextScreen: 'success',
    }
  }

  if (initialPinAttemptsRemaining !== null && connectionCheck.pin_tries_remaining_count !== null) {
    {
      if (
        (initialPinAttemptsRemaining > 0 && connectionCheck.pin_tries_remaining_count == 0) ||
        (initialPinAttemptsRemaining == 0 && connectionCheck.pin_tries_remaining_count == 0)
      ) {
        logger.debug('Maximum number of pin attempts has been reached.')
        return {
          localPinAttempts: connectionCheck.pin_tries_remaining_count,
          message:
            'Maximum number of pin attempts has been reached, please reach out to the company you are attempting to connect to.',
          nextScreen: 'error',
        }
      } else if (connectionCheck.pin_tries_remaining_count < initialPinAttemptsRemaining) {
        logger.debug(`Pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
        return {
          localPinAttempts: connectionCheck.pin_tries_remaining_count,
          message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
          nextScreen: 'form',
        }
      }
    }
  } else if (initialPinAttemptsRemaining === null) {
    if (initialPinAttemptsRemaining === null && connectionCheck.pin_tries_remaining_count === 4) {
      {
        logger.debug(`Pin was invalid remaining attempts number:${connectionCheck.pin_tries_remaining_count}.`)
        return {
          localPinAttempts: connectionCheck.pin_tries_remaining_count,
          message: `Sorry, your code is invalid. You have ${connectionCheck.pin_tries_remaining_count} attempts left before the PIN expires.`,
          nextScreen: 'form',
        }
      }
    }
  }
  logger.debug(`Pollig: No change in db detected.`)

  return false
}
