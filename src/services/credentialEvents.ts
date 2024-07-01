import argon2 from 'argon2'
import { inject, injectable, singleton } from 'tsyringe'

import { Env } from '../env.js'
import { Logger, type ILogger } from '../logger.js'
import { CredentialSchema } from '../models/credentialSchema.js'
import Database from '../models/db/index.js'
import type { Credential, CredentialFormatData, Schema } from '../models/veritableCloudagent.js'
import VeritableCloudagent from '../models/veritableCloudagent.js'
import VeritableCloudagentEvents from './veritableCloudagentEvents.js'

declare const CloudagentOn: VeritableCloudagentEvents['on']
type eventData<T> = Parameters<typeof CloudagentOn<T>>[1]

@singleton()
@injectable()
export default class CredentialEvents {
  constructor(
    private env: Env,
    private db: Database,
    private events: VeritableCloudagentEvents,
    private cloudagent: VeritableCloudagent,
    private schema: CredentialSchema,
    @inject(Logger) protected logger: ILogger
  ) {}

  public start() {
    this.events.on('CredentialStateChanged', this.credentialStateChangedHandler)
  }

  private credentialStateChangedHandler: eventData<'CredentialStateChanged'> = async (event) => {
    const record = event.payload.credentialRecord
    const formatData = await this.cloudagent.getCredentialFormatData(record.id)
    const maybeSchema = formatData.offer?.anoncreds.schema_id
      ? await this.cloudagent.getSchemaById(formatData.offer?.anoncreds.schema_id)
      : undefined

    if (this.isCompanyDetailsProposal(record, formatData)) {
      await this.handleProposalReceived(record, formatData)
      return
    }

    if (this.isCompanyDetailsOffer(record, formatData, maybeSchema)) {
      await this.handleOfferReceived(record, formatData)
      return
    }

    if (this.isCompanyDetailsRequestReceived(record, formatData, maybeSchema)) {
      await this.handleRequestReceived(record, formatData)
      return
    }

    if (this.isCompanyDetailsCredentialReceived(record, formatData, maybeSchema)) {
      await this.handleCredentialReceived(record, formatData)
      return
    }

    if (this.isCredentialDetailsDone(record, formatData, maybeSchema)) {
      await this.handleCredentialDone(record)
      return
    }

    return
  }

  private isCompanyDetailsProposal(credential: Credential, formatData: CredentialFormatData): boolean {
    return (
      credential.role === 'issuer' &&
      credential.state === 'proposal-received' &&
      formatData.proposal?.anoncreds.schema_name === 'COMPANY_DETAILS' &&
      formatData.proposal?.anoncreds.schema_version === '1.0.0'
    )
  }

  private isCompanyDetailsOffer(
    credential: Credential,
    formatData: CredentialFormatData,
    maybeSchema?: Schema
  ): boolean {
    return (
      credential.role === 'holder' &&
      credential.state === 'offer-received' &&
      formatData.proposal?.anoncreds.schema_name === 'COMPANY_DETAILS' &&
      formatData.proposal?.anoncreds.schema_version === '1.0.0' &&
      maybeSchema !== undefined &&
      maybeSchema.name === 'COMPANY_DETAILS' &&
      maybeSchema.version === '1.0.0'
    )
  }

  private isCompanyDetailsRequestReceived(
    credential: Credential,
    formatData: CredentialFormatData,
    maybeSchema?: Schema
  ): boolean {
    return (
      credential.role === 'issuer' &&
      credential.state === 'request-received' &&
      formatData.proposal?.anoncreds.schema_name === 'COMPANY_DETAILS' &&
      formatData.proposal?.anoncreds.schema_version === '1.0.0' &&
      maybeSchema !== undefined &&
      maybeSchema.name === 'COMPANY_DETAILS' &&
      maybeSchema.version === '1.0.0'
    )
  }

  private isCompanyDetailsCredentialReceived(
    credential: Credential,
    formatData: CredentialFormatData,
    maybeSchema?: Schema
  ): boolean {
    return (
      credential.role === 'holder' &&
      credential.state === 'credential-received' &&
      formatData.proposal?.anoncreds.schema_name === 'COMPANY_DETAILS' &&
      formatData.proposal?.anoncreds.schema_version === '1.0.0' &&
      maybeSchema !== undefined &&
      maybeSchema.name === 'COMPANY_DETAILS' &&
      maybeSchema.version === '1.0.0'
    )
  }

  private isCredentialDetailsDone(
    credential: Credential,
    formatData: CredentialFormatData,
    maybeSchema?: Schema
  ): boolean {
    return (
      credential.state === 'done' &&
      formatData.proposal?.anoncreds.schema_name === 'COMPANY_DETAILS' &&
      formatData.proposal?.anoncreds.schema_version === '1.0.0' &&
      maybeSchema !== undefined &&
      maybeSchema.name === 'COMPANY_DETAILS' &&
      maybeSchema.version === '1.0.0'
    )
  }

  private async handleProposalReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
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

    // check the pin number provided is valid
    const pinInvites = await this.db.get('connection_invite', { connection_id: connection.id })
    const isPinValid = (
      await Promise.all(
        pinInvites.map(async ({ pin_hash, expires_at }) => {
          if (expires_at < new Date()) {
            return false
          }
          return await argon2.verify(pin_hash, pinAttr.value, { secret: this.env.get('INVITATION_PIN_SECRET') })
        })
      )
    ).some((x) => x)

    if (!isPinValid) {
      this.logger.debug('Invalid pin detected in credential proposal for connection %s', connection.id)
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

  private async handleOfferReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredentialOffer(credential.id)
  }

  private async handleRequestReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredentialRequest(credential.id)
  }

  private async handleCredentialReceived(credential: Credential, formatData: CredentialFormatData): Promise<void> {
    if (!this.checkCompanyDetailsFormatDataConsistent(formatData)) {
      this.logger.debug('Invalid company_details credential offer')
      return
    }

    await this.cloudagent.acceptCredential(credential.id)
  }

  private async handleCredentialDone(credential: Credential): Promise<void> {
    await this.db.withTransaction(async (db) => {
      const connectionSearch = await db.get('connection', { agent_connection_id: credential.connectionId })
      const connection = connectionSearch[0] || undefined
      if (!connection) {
        throw new Error(`Unknown connection associated with credential ${credential.id}`)
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
    })
  }
}
