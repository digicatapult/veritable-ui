import express from 'express'
import { Get, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

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
    private cloudagent: VeritableCloudagent
  ) {
    super()
  }

  @SuccessResponse(200)
  @Get('/')
  public async listCredentials(@Request() req: express.Request, @Query() search: string = ''): Promise<HTML> {
    const credentials: Credential[] = await this.cloudagent.getCredentials()
    req.log.info('retrieved credentials from a cloudagent %j', credentials)

    const combined = credentials
      .map((cred: Credential) => {
        if (cred.credentialAttributes) {
          return {
            ...cred,
            updated_at: new Date(),
            company_name: cred.credentialAttributes[0].name === 'company_name' && cred.credentialAttributes[0].value,
            company_number:
              cred.credentialAttributes[1].name === 'company_number' && cred.credentialAttributes[1].value,
          }
        }
      })
      .filter((cred) =>
        search !== '' ? cred?.company_name.toString().toLowerCase().includes(search.toLowerCase()) : true
      )

    req.log.info('%j', combined, credentials)
    if (search !== '') {
      req.log.info('applying search filter... %j', combined) // do some mapping
    }

    this.setHeader('HX-Replace-Url', search ? `/credentials?search=${encodeURIComponent(search)}` : `/credentials`)
    return this.html(this.credentialsTemplates.listPage(combined, search?.toString()))
  }
}
