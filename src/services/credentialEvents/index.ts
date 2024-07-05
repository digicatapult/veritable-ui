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
      ? await this.cloudagent.getSchemaById(formatData.offer.anoncreds.schema_id)
      : null

    let handler: CredentialEventHandlerBase | null = null
    if (this.isHandlerForEvent(this.companyDetailsHandler, record, formatData)) {
      handler = this.companyDetailsHandler
      this.logger.debug(
        'Event handler found for event %s %s for credential %s',
        this.companyDetailsHandler.schemaName,
        this.companyDetailsHandler.schemaVersion,
        record.id
      )
    }

    if (!handler) {
      this.logger.debug('No handler found for credential event')
      return
    }

    if (this.isProposalReceived(record)) {
      this.logger.debug('Proposal received event for %s', record.id)
      await handler.handleProposalReceived(record, formatData)
      return
    }

    // if we have a schema we need to make sure it is valid with the schema we're using moving forward
    if (!this.isSchemaValid(formatData, maybeSchema)) {
      this.logger.warn('Schema was not valid for credential %s. Schema does not match proposal', record.id)
      return
    }

    if (this.isOfferReceived(record)) {
      this.logger.debug('Offer received event for %s', record.id)
      await handler.handleOfferReceived(record, formatData)
      return
    }

    if (this.isRequestReceived(record)) {
      this.logger.debug('Request received event for %s', record.id)
      await handler.handleRequestReceived(record, formatData)
      return
    }

    if (this.isCredentialReceived(record)) {
      this.logger.debug('Credential received event for %s', record.id)
      await handler.handleCredentialReceived(record, formatData)
      return
    }

    if (this.isDone(record)) {
      this.logger.debug('Credential exchange done event for %s', record.id)
      await handler.handleDone(record, formatData)
      return
    }

    this.logger.debug('Ignoring event on credential %s with state %s as role %s', record.id, record.state, record.role)
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
      formatData.proposal?.anoncreds.schema_version === maybeSchema.version
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
