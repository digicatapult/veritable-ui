import { expect, Page, test } from '@playwright/test'
import type express from 'express'
import { container } from 'tsyringe'
import { Env } from '../../src/env/index.js'
import { ILogger, Logger } from '../../src/logger.js'
import Database from '../../src/models/db/index.js'
import { ConnectionRow } from '../../src/models/db/types.js'
import VeritableCloudagent, { Connection } from '../../src/models/veritableCloudagent.js'
import VeritableCloudagentEvents from '../../src/services/veritableCloudagentEvents.js'
import { withVerifiedConnection } from '../helpers/connection'
import { del } from '../helpers/routeHelper'
import { CustomBrowserContext, withCleanAlice, withLoggedInUser, withRegisteredAccount } from './helpers/registerLogIn'

test.describe('Updating Settings - email', () => {
  const db = container.resolve(Database)
  const cloudagent = container.resolve(VeritableCloudagent)
  let context: CustomBrowserContext
  let page: Page
  const env = container.resolve(Env)
  const logger = container.resolve<ILogger>(Logger)

  const baseUrlAlice = process.env.VERITABLE_ALICE_PUBLIC_URL || 'http://localhost:3000'

  const remoteCloudagent = new VeritableCloudagent(env, logger)
  const cloudagentEvents = new VeritableCloudagentEvents(env, remoteCloudagent, logger)

  type Context = {
    app: express.Express
    cloudagentEvents
    remoteDatabase: Database
    remoteCloudagent
    remoteConnectionId: string
    localConnectionId: string
    response: Awaited<ReturnType<typeof del>>
  }
  const connectionContext: Context = {} as Context

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    // check connections before
    const localConnections: ConnectionRow[] = await db.get('connection', {})
    const agentConnections: Connection[] = await cloudagent.getConnections()
    expect(localConnections.length).toEqual(1)
    expect(agentConnections.length).toEqual(1)

    await withRegisteredAccount(page, context, baseUrlAlice)
  })
  test.beforeEach(async () => {
    await withCleanAlice(baseUrlAlice)
    page = await context.newPage()
    await withLoggedInUser(page, context, baseUrlAlice)
  })

  test.afterEach(async () => {
    await withCleanAlice(baseUrlAlice)
    await page.close()
  })

  test('Click reset on Alice', async () => {
    test.setTimeout(100000)
    withVerifiedConnection(connectionContext)

    await page.waitForSelector('a[href="/settings"]')
    await page.click('a[href="/settings"]')
    await page.waitForURL(`${baseUrlAlice}/settings`)

    await page.waitForSelector('#reset-btn')
    await page.click('#reset-btn')
  })
})
