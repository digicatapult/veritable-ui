export const delay = (delayMs: number) => new Promise<void>((r) => setTimeout(r, delayMs))

export const delayAndReject = (delayMs: number, message: string = 'Timeout') =>
  new Promise<void>((_, r) => setTimeout(r, delayMs, new Error(message)))
