import express from 'express'
import { Readable } from 'node:stream'
import { Controller, Middlewares } from 'tsoa'

export type HTML = Readable

export abstract class HTMLController extends Controller {
  @Middlewares(async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.log.trace('returning text/html content %o', { req })
    next()
  })
  public async html(element: JSX.Element): Promise<HTML> {
    this.setHeader('Content-Type', 'text/html')
    return Readable.from(Buffer.from(await element, 'utf8'))
  }

  @Middlewares(async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.log.trace('triggering an htmx event', { req })
    next()
  })
  public triggerEvent(eventName: string): void {
    this.setHeader('HX-Trigger', eventName)
  }
}
