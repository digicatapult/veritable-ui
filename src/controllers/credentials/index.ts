import express from 'express'
import { Get, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
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

    const formatted: Credentials[] = this.format(credentials)
    for (let i = 0; i < formatted.length; i++) {
      const [connection]: ConnectionRow[] = await this.db.get('connection', {
        agent_connection_id: formatted[i].connectionId,
      })

      if (connection) formatted[i].connection = connection
    }

    const filtered = formatted.filter(({ connection, company_name }) => {
      if (!connection || !company_name) return false
      if (search === '') return true
      req.log.info('checking if %s includes %s', company_name, search)

      return company_name.toLowerCase().includes(search.toLowerCase())
    })

    req.log.info('returming HTML along with formatted credentials %j', formatted)

    this.setHeader('HX-Replace-Url', search ? `/credentials?search=${encodeURIComponent(search)}` : `/credentials`)
    return this.html(this.credentialsTemplates.listPage(filtered, search))
  }

  private format(credentials: Credential[]): Credentials[] {
    return credentials.map((cred) => {
      return {
        ...cred,
        ...(cred?.credentialAttributes || []).reduce(
          (out: { [k: string]: string }, { name, value }: { name: string; value: string }) => {
            if (out[name]) return out
            return { ...out, [name]: value }
          },
          {}
        ),
        connection: {},
      }
    }) as unknown as Credentials[]
  }
}
