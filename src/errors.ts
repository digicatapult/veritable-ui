export type ErrorCategory = 'Internal' | 'User'

export abstract class HttpError extends Error {
  constructor(
    private _category: ErrorCategory,
    private _code: number,
    private _userTitle: string,
    private _userMessage: string,
    detail: string
  ) {
    super(detail)
  }
  public get code(): number {
    return this._code
  }

  public get category(): ErrorCategory {
    return this._category
  }

  public get userTitle(): string {
    return this._userTitle
  }

  public get userMessage(): string {
    return this._userMessage
  }
}

export class DatabaseTimeoutError extends Error {
  constructor(message?: string) {
    super(message)
  }
}

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    super('User', 400, 'Bad request', message || 'Bad request', message || 'Bad request')
  }

  public get code(): number {
    return 400
  }
}

export class NotFoundError extends HttpError {
  constructor(item?: string) {
    super('User', 404, 'Not Found', `${item} - not found`, `${item} - not found`)
  }

  public get code(): number {
    return 404
  }
}

export class InvalidInputError extends HttpError {
  constructor(message?: string) {
    super('User', 400, 'Invalid Input', message || 'Invalid Input', message || 'Invalid Input')
  }

  public get code(): number {
    return 400
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super('User', 401, 'Forbidden', message || 'Forbidden', message || 'Forbidden')
  }

  public get code(): number {
    return 401
  }
}

export class InternalError extends HttpError {
  constructor(error?: Error | string | unknown) {
    if (error instanceof Error) {
      super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', error.message)
      return
    }

    if (typeof error === 'string') {
      super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', error)
      return
    }

    super('Internal', 500, 'Internal Error', 'Please contact the technical team or try again later', `${error}`)
  }

  public get code(): number {
    return 500
  }
}

export class MethodNotImplementedError extends HttpError {
  constructor(error?: Error | string | unknown) {
    if (error instanceof Error) {
      super('Internal', 501, 'Not Implemented', 'Please contact the technical team or try again later', error.message)
      return
    }

    if (typeof error === 'string') {
      super('Internal', 501, 'Not Implemented', 'Please contact the technical team or try again later', error)
      return
    }

    super('Internal', 501, 'Not Implemented', 'Please contact the technical team or try again later', `${error}`)
  }

  public get code(): number {
    return 501
  }
}
