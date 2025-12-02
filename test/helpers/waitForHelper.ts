import { Page } from '@playwright/test'

export const waitForHTMXSettle = async (page: Page) => {
  return page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const handler = () => {
        document.body.removeEventListener('htmx:afterSettle', handler)
        resolve()
      }
      document.body.addEventListener('htmx:afterSettle', handler, { once: true })
    })
  })
}

export const waitForHTMXSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const settlePromise = waitForHTMXSettle(page)

  const [resp] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes(includeRoute) && [200, 204, 302, 304].includes(resp.status())),
    action(),
  ])

  await settlePromise

  return resp
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    const acceptableStatuses = new Set([200, 204, 302, 304])
    if (!acceptableStatuses.has(resp.status())) {
      throw new Error(`Caught bad request to '${resp.url()}' failed with: ${resp.status()}`)
    }

    return resp.url().includes(includeRoute) && resp.status() === 200
  })
  await action()
  await response
}

export const waitFor500Response = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    return resp.url().includes(includeRoute) && resp.status() === 500
  })
  await action()
  await response
}
