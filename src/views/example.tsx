/// <reference types="@kitajs/html/htmx.d.ts" />

import { singleton } from 'tsyringe'
import { Page } from './common'

@singleton()
export default class ExampleTemplates {
  constructor() {}

  public Root = (title: string, count: number) => (
    <Page title={title}>
      <this.Counter count={count} />
      <this.Button disabled={false} />
    </Page>
  )

  public Counter = ({ count }: { count: number }) => (
    <div id="counter" hx-get="/example/counter" hx-trigger="button-click from:body" hx-swap="outerHTML">
      <span>{count}</span>
      <img class="spinner htmx-indicator" src="/public/images/spinner.svg" />
    </div>
  )

  public Button = ({ disabled }: { disabled: boolean }) => {
    const attributes: Htmx.Attributes = disabled
      ? {
          'hx-target': 'closest .button-group',
          'hx-trigger': 'counter-loaded from:body',
          'hx-get': '/example/button',
          'hx-swap': 'outerHTML',
        }
      : { 'hx-target': 'closest .button-group', 'hx-post': '/example/button', 'hx-swap': 'outerHTML' }

    return (
      <div class="button-group">
        <button disabled={disabled} {...attributes}>
          Click me!
        </button>
      </div>
    )
  }
}
