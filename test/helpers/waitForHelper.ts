import { Page } from '@playwright/test'

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

export const waitFor501Response = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    return resp.url().includes(includeRoute) && resp.status() === 501
  })
  await action()
  await response
}
