import { inject, injectable, singleton } from 'tsyringe'

import { Logger, type ILogger } from '../../logger.js'
import type { Credential, CredentialFormatData, Schema } from '../../models/veritableCloudagent.js'
import VeritableCloudagent from '../../models/veritableCloudagent.js'
import VeritableCloudagentEvents from '../veritableCloudagentEvents.js'
import CompanyDetailsV1Handler from './companyDetailsV1.js'
import { CredentialEventHandler, CredentialEventHandlerBase } from './types.js'

declare const CloudagentOn: VeritableCloudagentEvents['on']
type eventData<T> = Parameters<typeof CloudagentOn<T>>[1]

@singleton()
@injectable()
export default class CredentialEvents {
  constructor(
    private events: VeritableCloudagentEvents,
    private cloudagent: VeritableCloudagent,
    private companyDetailsHandler: CompanyDetailsV1Handler,
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
      : null

    let handler: CredentialEventHandlerBase | null = null
    if (this.isHandlerForEvent(this.companyDetailsHandler, record, formatData)) {
      handler = this.companyDetailsHandler
    }

    if (!handler) {
      return
    }

    if (this.isProposalReceived(record)) {
      await handler.handleProposalReceived(record, formatData)
      return
    }

    // if we have a schema we need to make sure it is valid with the schema we're using moving forward
    if (!this.isSchemaValid(formatData, maybeSchema)) {
      return
    }

    if (this.isOfferReceived(record)) {
      await handler.handleOfferReceived(record, formatData)
      return
    }

    if (this.isRequestReceived(record)) {
      await handler.handleRequestReceived(record, formatData)
      return
    }

    if (this.isCredentialReceived(record)) {
      await handler.handleCredentialReceived(record, formatData)
      return
    }

    if (this.isDone(record)) {
      await handler.handleDone(record)
      return
    }

    return
  }

  private isHandlerForEvent<N extends string, V extends string>(
    handler: CredentialEventHandler<N, V>,
    credential: Credential,
    formatData: CredentialFormatData
  ): boolean {
    return (
      credential.protocolVersion === 'v2' &&
      formatData.proposal?.anoncreds.schema_name === handler.schemaName &&
      formatData.proposal?.anoncreds.schema_version === handler.schemaVersion
    )
  }

  private isProposalReceived(credential: Credential): boolean {
    return credential.role === 'issuer' && credential.state === 'proposal-received'
  }

  private isSchemaValid(formatData: CredentialFormatData, maybeSchema: Schema | null): boolean {
    return (
      maybeSchema !== null &&
      formatData.proposal?.anoncreds.schema_name === maybeSchema.name &&
      formatData.proposal?.anoncreds.schema_version !== maybeSchema.version
    )
  }

  private isOfferReceived(credential: Credential): boolean {
    return credential.role === 'holder' && credential.state === 'offer-received'
  }

  private isRequestReceived(credential: Credential): boolean {
    return credential.role === 'issuer' && credential.state === 'request-received'
  }

  private isCredentialReceived(credential: Credential): boolean {
    return credential.role === 'holder' && credential.state === 'credential-received'
  }

  private isDone(credential: Credential): boolean {
    return credential.state === 'done'
  }
}
