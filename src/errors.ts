export abstract class HttpError extends Error {
  public abstract get code(): number
}

export class DatabaseTimeoutError extends Error {
  constructor(message?: string) {
    super(message)
  }
}

export class NotFoundError extends HttpError {
  constructor(item: string) {
    super(`${item} - not found`)
  }

  public get code(): number {
    return 404
  }
}

export class InvalidInputError extends HttpError {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 400
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 401
  }
}

export class InternalError extends HttpError {
  constructor(message?: string) {
    super(message)
  }

  public get code(): number {
    return 501
  }
}
