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

    const formatted = await Promise.all(credentials.map((c) => this.formatCredential(req, c)))
    const filtered = formatted
      .filter((x) => !!x)
      .filter(({ companyName }) => !search || companyName.toLowerCase().includes(search.toLowerCase()))

    req.log.info('returning HTML along with formatted credentials %j', formatted)

    this.setHeader('HX-Replace-Url', search ? `/credentials?search=${encodeURIComponent(search)}` : `/credentials`)
    return this.html(this.credentialsTemplates.listPage(filtered, search))
  }

  private async formatCredential(req: express.Request, credential: Credential) {
    const [connection]: ConnectionRow[] = await this.db.get('connection', {
      agent_connection_id: credential.connectionId,
    })
    req.log.trace('Connection for credential %s: %s', credential.id, connection?.id)
    if (!connection) return null

    const schemaId = credential.metadata?.['_anoncreds/credential']?.schemaId
    req.log.trace('Schema Id for credential %s: %s', credential.id, schemaId)
    if (!schemaId) return null

    const schema = await this.cloudagent.getSchemaById(schemaId)
    req.log.trace('Schema for credential %s is of type: %s', credential.id, schema.name)
    if (schema.name !== 'COMPANY_DETAILS') return null

    const result = {
      companyName: connection.company_name,
      type: 'Supplier credentials' as const,
      ...credential,
    }
    req.log.debug('Credential found %s: %j', credential.id, result)
    return result
  }
}
