/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'node:crypto'
import { ErrorCategory, HttpError, InternalError } from '../../errors.js'

const categoryToClass = (category: ErrorCategory): 'internal-error' | 'data-error' => {
  switch (category) {
    case 'Internal':
      return 'internal-error'
    case 'User':
      return 'data-error'
  }
}

export function errorToast(error: unknown) {
  const httpError = error instanceof HttpError ? error : new InternalError(error)
  const dialogId = randomUUID()
  const modellingErrorDetail = () => {
    try {
      const parsed = JSON.parse(httpError.message)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return httpError.message
    }
  }

  return {
    dialogId,
    response: (
      <dialog open id={dialogId}>
        <img src="/public/images/error.svg" width="54px" height="50px" class={categoryToClass(httpError.category)} />
        <div class="toast-content">
          <h1>{escapeHtml(httpError.userTitle)}</h1>
          {httpError.message ? (
            <details class="toast-detail">
              <summary class="detail-summary">{escapeHtml(httpError.userMessage)}</summary>
              <pre>{escapeHtml(modellingErrorDetail())}</pre>
            </details>
          ) : (
            <p>{escapeHtml(httpError.userMessage)}</p>
          )}
        </div>
        <form method="dialog">
          <button class="modal-button" />
        </form>
      </dialog>
    ),
  }
}
