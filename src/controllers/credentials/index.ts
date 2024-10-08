import express from 'express'
import { Get, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import Database from '../../models/db/index.js'
import { ConnectionRow } from '../../models/db/types.js'
import VeritableCloudagent, { Credential } from '../../models/veritableCloudagent.js'
import CredentialListTemplates from '../../views/credentials/index.js'
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

    const formatted = this.format(credentials)
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

    req.log.info('returning HTML along with formatted credentials %j', formatted)

    this.setHeader('HX-Replace-Url', search ? `/credentials?search=${encodeURIComponent(search)}` : `/credentials`)
    return this.html(this.credentialsTemplates.listPage(filtered, search))
  }

  private format(credentials: Credential[]) {
    return credentials
      .map((cred) => {
        const company_name = cred.credentialAttributes?.find(({ name }) => name === 'company_name')
        if (!company_name) return undefined

        return {
          ...cred,
          company_name: company_name.value,
          connection: undefined as unknown,
        }
      })
      .filter((x) => !!x)
  }
}
