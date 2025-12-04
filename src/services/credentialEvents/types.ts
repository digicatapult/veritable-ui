import { Credential, CredentialFormatData } from '../../models/veritableCloudagent/internal.js'

export interface CredentialEventHandlerBase {
  handleProposalReceived(credential: Credential, formatData: CredentialFormatData): Promise<void>
  handleOfferReceived(credential: Credential, formatData: CredentialFormatData): Promise<void>
  handleRequestReceived(credential: Credential, formatData: CredentialFormatData): Promise<void>
  handleCredentialReceived(credential: Credential, formatData: CredentialFormatData): Promise<void>
  handleDone(credential: Credential, formatData: CredentialFormatData): Promise<void>
}

export interface CredentialEventHandler<
  EventName extends string,
  EventVersion extends string,
> extends CredentialEventHandlerBase {
  get schemaName(): EventName
  get schemaVersion(): EventVersion
}
