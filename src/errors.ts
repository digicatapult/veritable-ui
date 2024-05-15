export abstract class HttpError extends Error {
  public abstract get code(): number
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
