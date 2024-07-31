import argon2 from 'argon2'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../../env.js'
import { Logger, type ILogger } from '../../logger.js'
import { CredentialSchema } from '../../models/credentialSchema.js'
import Database from '../../models/db/index.js'
import type { Credential, CredentialFormatData } from '../../models/veritableCloudagent.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import { CredentialEventHandler } from './types.js'

@singleton()
@injectable()
export default class CompanyDetailsV1Handler implements CredentialEventHandler<'COMPANY_DETAILS', '1.0.0'> {
  constructor(
    private env: Env,
    private db: Database,
    private cloudagent: VeritableCloudagent,
    private schema: CredentialSchema,
    @inject(Logger) protected logger: ILogger
  ) {}

  public get schemaName() {
    return 'COMPANY_DETAILS' as const
  }
  public get schemaVersion() {
    return '1.0.0' as const
  }

  public async handleProposalReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    // fetch db record for connection and verify that the remote connection state is unverified
    const companyNameAttr = formatData.proposalAttributes?.find((attr) => attr.name === 'company_name')
    const companyNumberAttr = formatData.proposalAttributes?.find((attr) => attr.name === 'company_number')
    const pinAttr = formatData.proposalAttributes?.find((attr) => attr.name === 'pin')

    // validate we at least have the necessary attributes
    if (!companyNameAttr || !companyNumberAttr || !pinAttr) {
      this.logger.debug('Invalid company_details credential proposal')
      return
    }

    // check we have a local connection associated with the didcomm connection. If not there may be timing weirdness so throw to retry
    const connectionSearch = await this.db.get('connection', { agent_connection_id: credential.connectionId })
    const connection = connectionSearch[0] || undefined
    if (!connection) {
      throw new Error(`Event from unknown connection ${credential.connectionId}`)
    }

    // check connection status is valid
    if (connection.status !== 'unverified' && connection.status !== 'verified_us') {
      this.logger.trace('Credential proposal found for connection %s in status %s', connection.id, connection.status)
      return
    }

    // check the name and number attributes match
    if (connection.company_name !== companyNameAttr.value || connection.company_number !== companyNumberAttr.value) {
      this.logger.trace(
        'Invalid credential proposal received on connection %s.\nProposed: (%s, %s)\nDatabase (%s, %s)',
        connection.id,
        companyNameAttr.value,
        companyNumberAttr.value,
        connection.company_name,
        connection.company_number
      )
      return
    }

    // before we check pin validity check we haven't had too many pin attempts already
    const [{ pin_attempt_count: pinAttemptCount }] = await this.db.increment('connection', 'pin_attempt_count', {
      id: connection.id,
    })
    if (pinAttemptCount >= this.env.get('INVITATION_PIN_ATTEMPT_LIMIT')) {
      this.logger.warn(
        { connectionId: connection.id },
        'PIN verification attempt count exceeded for connection %s',
        connection.id
      )
      const problemReportPin: { message: string; pinTries: number } = {
        message: `PIN verification attempt count exceeded for connection ${connection.id}`,
        pinTries: 5 - pinAttemptCount,
      }
      await this.db.update('connection_invite', { connection_id: connection.id }, { validity: 'too_many_attempts' })
      await this.db.update('connection', { id: connection.id }, { pin_attempt_count: 0 }) // reset so if a new pin is sent they can try again
      await this.cloudagent.sendProblemReport(credential.id, JSON.stringify(problemReportPin))

      return
    }

    // check the pin number provided is valid
    const pinInvites = await this.db.get('connection_invite', {
      connection_id: connection.id,
      validity: 'valid',
    })
    const isPinValid = (
      await Promise.all(
        pinInvites.map(async ({ pin_hash, expires_at, id }) => {
          if (expires_at < new Date()) {
            await this.db.update('connection_invite', { id }, { validity: 'expired' })
            return false
          }
          return await argon2.verify(pin_hash, pinAttr.value, { secret: this.env.get('INVITATION_PIN_SECRET') })
        })
      )
    ).some((x) => x)

    if (!isPinValid) {
      this.logger.debug('Invalid pin detected in credential proposal for connection %s', connection.id)
      this.logger.debug('Pin attempt count: %s', connection.id)
      const problemReportPin: { message: string; pinTries: number } = {
        message: `Invalid pin detected in credential proposal for connection ${connection.id}`,
        pinTries: 5 - pinAttemptCount,
      }
      await this.cloudagent.sendProblemReport(credential.id, JSON.stringify(problemReportPin))

      return
    }

    // at this point we have detected:
    //   a company verification action for a connection
    //   that the connection needed company verification
    //   that the company attributes provided are valid
    //   that the PIN supplied is valid
    // on this basis we are ready to offer a credential in this exchange

    await this.cloudagent.acceptProposal(credential.id, {
      credentialDefinitionId: this.schema.issuanceRecords.credentialDefinitionId.COMPANY_DETAILS,
      attributes: [
        {
          name: 'company_name',
          value: companyNameAttr.value,
        },
        {
          name: 'company_number',
          value: companyNumberAttr.value,
        },
      ],
    })
  }

  private checkCompanyDetailsFormatDataConsistent(formatData: CredentialFormatData): boolean {
    const companyNamePropAttr = formatData.proposalAttributes?.find((attr) => attr.name === 'company_name')
    const companyNumberPropAttr = formatData.proposalAttributes?.find((attr) => attr.name === 'company_number')
    const companyNameOfferAttr = formatData.offerAttributes?.find((attr) => attr.name === 'company_name')
    const companyNumberOfferAttr = formatData.offerAttributes?.find((attr) => attr.name === 'company_number')

    if (!companyNamePropAttr || !companyNumberPropAttr || !companyNameOfferAttr || !companyNumberOfferAttr) {
      return false
    }

    if (
      companyNamePropAttr.value !== companyNameOfferAttr.value ||
      companyNumberPropAttr.value !== companyNumberOfferAttr.value
    ) {
      return false
    }

    return true
  }

  public async handleOfferReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredentialOffer(credential.id)
  }

  public async handleRequestReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredentialRequest(credential.id)
  }

  public async handleCredentialReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredential(credential.id)
  }

  public async handleDone(credential: Credential): Promise<void> {
    await this.db.withTransaction(async (db) => {
      const connectionSearch = await db.get('connection', { agent_connection_id: credential.connectionId })
      const connection = connectionSearch[0] || undefined
      if (!connection) {
        this.logger.warn('Unknown connection %s associated with credential %s', credential.connectionId, credential.id)
        return
      }

      let newState: typeof connection.status | null = null
      if (connection.status === 'unverified') {
        newState = credential.role === 'holder' ? 'verified_us' : 'verified_them'
      }

      if (connection.status === 'verified_them' && credential.role === 'holder') {
        newState = 'verified_both'
      }

      if (connection.status === 'verified_us' && credential.role === 'issuer') {
        newState = 'verified_both'
      }

      if (newState === null) {
        return
      }

      await db.update('connection', { id: connection.id }, { status: newState })

      if (credential.role === 'issuer') {
        await db.update('connection_invite', { connection_id: connection.id }, { validity: 'used' })
      }
    })
  }
}
