import { Get, Post, Produces, Route, SuccessResponse } from 'tsoa'
import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../logger.js'
import Counter from '../models/counter.js'
import ExampleTemplates from '../views/example.js'
import { HTML, HTMLController } from './HTMLController.js'

@singleton()
@injectable()
@Route('/example')
@Produces('text/html')
export class RootController extends HTMLController {
  constructor(
    private counter: Counter,
    private templates: ExampleTemplates,
    @inject(Logger) private logger: ILogger
  ) {
    super()
    this.logger = logger.child({ controller: '/' })
  }

  /**
   * Retrieves the root page for the site
   */
  @SuccessResponse(200)
  @Get('/')
  public async get(): Promise<HTML> {
    this.logger.debug('root page requested')
    return this.html(this.templates.Root('TSOA HTMX demo', this.counter.get()))
  }

  /**
   * Returns a HTML fragment of the root page counter
   */
  @SuccessResponse(200)
  @Get('/counter')
  public async getCounter(): Promise<HTML> {
    this.logger.debug('counter received')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.triggerEvent('counter-loaded')
    return this.html(this.templates.Counter({ count: this.counter.get() }))
  }

  /**
   * Increments counter and returns a disabled button
   */
  @SuccessResponse(200)
  @Post('/button')
  public async buttonClick(): Promise<HTML> {
    this.logger.debug('click received')
    this.counter.increment()
    this.triggerEvent('button-click')
    return this.html(this.templates.Button({ disabled: true }))
  }

  /**
   * Returns a HTML fragment of the root page button
   */
  @SuccessResponse(200)
  @Get('/button')
  public async button(): Promise<HTML> {
    this.logger.debug('button received')
    return this.html(this.templates.Button({ disabled: false }))
  }
}
