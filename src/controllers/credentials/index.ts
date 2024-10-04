import express from 'express'
import { Get, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import Database from '../../models/db/index.js'
import VeritableCloudagent, { Credential } from '../../models/veritableCloudagent.js'
import CredentialListTemplates, { Credentials } from '../../views/credentials/index.js'
import { HTML, HTMLController } from '../HTMLController.js'

@injectable()
@Security('oauth2')
@Route('/credentials')
@Produces('text/html')
export class CredentialsController extends HTMLController {
  constructor(
    private credentialsTemplates: CredentialListTemplates,
    private cloudagent: VeritableCloudagent,
    private db: Database
  ) {
    super()
  }

  @SuccessResponse(200)
  @Get('/')
  public async listCredentials(@Request() req: express.Request, @Query() search: string = ''): Promise<HTML> {
    const credentials: Credential[] = await this.cloudagent.getCredentials()
    req.log.info('retrieved credentials from a cloudagent %j', credentials)

    const formatted = (await this.format(credentials)).filter(({ attributes: company_name }) => {
      if (search !== '') return true
      if (!company_name) return false
      req.log.info('checking if %s includes %s', company_name, search)

      return company_name.toString().toLowerCase().includes(search.toLowerCase())
    })

    req.log.info('returming HTML along with formatted credentials %j', formatted)

    this.setHeader('HX-Replace-Url', search ? `/credentials?search=${encodeURIComponent(search)}` : `/credentials`)
    return this.html(this.credentialsTemplates.listPage(formatted, search))
  }

  /*
      credentials: [],
    id: 'ee24e268-b1eb-4501-8ecf-37c2a3e76b82',
    createdAt: '2024-10-01T12:48:38.975Z',
    state: 'done',
    role: 'issuer',
    connectionId: '65e99592-1989-4087-b7a3-ee50695b3457',
    threadId: '31a03353-39b2-4283-b16c-19db38c8e157',
    protocolVersion: 'v2',
    updatedAt: '2024-10-01T12:48:39.395Z',
    credentialAttributes: [
    */
  private async format(credentials: Credential[]): Promise<Credentials> {
    /* some Validated cred */
    return credentials.map(async (cred) => {
      return {
        ...cred,
        attributes: cred?.credentialAttributes || [].map(({ name, value }) => ({ [name]: value })),
        connection: await this.db.get('connection', { agent_connection_id: cred.connectionId }),
      }
    }) as unknown as Credentials
  }
}
