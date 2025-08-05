import argon2 from 'argon2'
import express from 'express'
import { randomInt } from 'node:crypto'
import { pino } from 'pino'
import { Body, Get, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../../env/index.js'
import { NotFoundError } from '../../errors.js'
import { Logger, type ILogger } from '../../logger.js'
import Database from '../../models/db/index.js'
import { type RegistryType } from '../../models/db/types.js'
import EmailService from '../../models/emailService/index.js'
import OrganisationRegistry, { SharedOrganisationInfo } from '../../models/orgRegistry/organisationRegistry.js'
import {
  base64UrlRegex,
  companyNumberRegex,
  countryCodes,
  PIN_CODE,
  SOCRATA_NUMBER,
  socrataRegex,
  type BASE_64_URL,
  type COMPANY_NUMBER,
  type CountryCode,
  type EMAIL,
  type UUID,
} from '../../models/stringTypes.js'
import VeritableCloudagent from '../../models/veritableCloudagent/index.js'
import { neverFail } from '../../utils/promises.js'
import { FromInviteTemplates } from '../../views/newConnection/fromInvite.js'
import { NewInviteFormStage, NewInviteTemplates } from '../../views/newConnection/newInvite.js'
import { PinSubmissionTemplates } from '../../views/newConnection/pinSubmission.js'
import { HTML, HTMLController } from '../HTMLController.js'

const submitToFormStage = {
  back: 'form',
  continue: 'confirmation',
  submit: 'success',
} as const

const inviteParser = z.object({
  companyNumber: z.string(),
  goalCode: z.enum(countryCodes),
  inviteUrl: z.url(),
})
type Invite = z.infer<typeof inviteParser>
export type CountryRegistries = {
  country_code: string
  registry_name: string
  registry_key: string
  third_party: boolean
}

@injectable()
@Security('oauth2')
@Route('/connection/new')
@Produces('text/html')
export class NewConnectionController extends HTMLController {
  constructor(
    private db: Database,
    private organisationRegistry: OrganisationRegistry,
    private cloudagent: VeritableCloudagent,
    private email: EmailService,
    private newInvite: NewInviteTemplates,
    private fromInvite: FromInviteTemplates,
    private pinSubmission: PinSubmissionTemplates,
    private env: Env,
    @inject(Logger) private logger: ILogger
  ) {
    super()
  }

  /**
   *
   * @returns The new connections form page
   */
  @SuccessResponse(200)
  @Get('/')
  public async newConnectionForm(
    @Request() req: express.Request,
    @Query() fromInvite: boolean = false,
    @Query() registryCountryCode: CountryCode = 'GB'
  ): Promise<HTML> {
    // send back updated registry options after we have taken the country code

    // get available registries for a country and send back
    const availableRegistries = await this.db.get('organisation_registries', {
      country_code: registryCountryCode,
    })

    // Filter registries into two arrays based on third_party field
    const thirdPartyRegistries = availableRegistries.filter((registry) => registry.third_party === true)
    const countryRegistries = availableRegistries.filter((registry) => registry.third_party === false)

    // Map to only include required fields this should not access the API_KEY
    const filteredThirdPartyRegistries: CountryRegistries[] = thirdPartyRegistries.map((registry) => ({
      country_code: registry.country_code,
      registry_name: registry.registry_name,
      registry_key: registry.registry_key,
      third_party: registry.third_party,
    }))

    const filteredCountryRegistries: CountryRegistries[] = countryRegistries.map((registry) => ({
      country_code: registry.country_code,
      registry_name: registry.registry_name,
      registry_key: registry.registry_key,
      third_party: registry.third_party,
    }))
    const registryOptionsPerCountry: {
      thirdPartyRegistries: CountryRegistries[]
      countryRegistries: CountryRegistries[]
    } = {
      thirdPartyRegistries: filteredThirdPartyRegistries,
      countryRegistries: filteredCountryRegistries,
    }
    if (fromInvite) {
      req.log.trace('rendering new connection receiver form')
      return this.html(
        this.fromInvite.fromInviteFormPage({
          type: 'message',
          message: 'Please paste the invite text from the invitation email',
          registryOptionsPerCountry,
        })
      )
    }

    req.log.trace('rendering new connection requester form')
    req.log.debug('updating pattern for country %s', registryCountryCode)
    const pattern = registryCountryCode === 'GB' ? companyNumberRegex.source : socrataRegex.source
    const minLength = registryCountryCode === 'GB' ? 8 : 7
    const maxLength = registryCountryCode === 'GB' ? 8 : 7

    return this.html(
      this.newInvite.newInviteFormPage({
        type: 'message',
        message: 'Please type in a valid company number to populate information',
        regex: pattern,
        minlength: minLength,
        maxlength: maxLength,
        registryOptionsPerCountry,
      })
    )
  }

  /**
   * @returns a company from a validated company number
   */
  @SuccessResponse(200)
  @Get('/verify-company')
  public async verifyCompanyForm(
    @Request() req: express.Request,
    @Query() registryCountryCode: CountryCode,
    @Query() selectedRegistry: RegistryType,
    @Query() companyNumber: COMPANY_NUMBER | SOCRATA_NUMBER
  ): Promise<HTML> {
    req.log.debug('verifying %s company number for country %s', companyNumber, registryCountryCode)

    if (registryCountryCode === 'GB' && !companyNumber.match(companyNumberRegex)) {
      req.log.info('company %s number did not match %s regex', companyNumber, companyNumberRegex)
      return this.newConnectionForm(req)
    }

    const companyOrError = await this.lookupCompany(req.log, registryCountryCode, selectedRegistry, companyNumber)
    if (companyOrError.type === 'error') {
      req.log.warn('Error occured while looking up the company %j', {
        companyNumber,
        registryCountryCode,
        selectedRegistry,
        err: companyOrError,
      })
      return this.newInviteErrorHtml(companyOrError.message, undefined, companyNumber)
    }
    req.log.debug('company found, rendering next stage %j', companyOrError)

    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company: companyOrError.company,
        },
        formStage: 'form',
        companyNumber,
        registryCountryCode,
      })
    )
  }

  /**
   * @returns a invite from a validated connection invitation
   */
  @SuccessResponse(200)
  @Get('/verify-invite')
  public async verifyInviteForm(@Request() req: express.Request, @Query() invite: BASE_64_URL): Promise<HTML> {
    if (invite === '') {
      return this.newConnectionForm(req, true)
    }
    req.log.debug('new invite [%s] received', invite)

    if (!invite.match(base64UrlRegex)) {
      req.log.info('submitted invitation is not in base64 %s', invite)
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    const inviteOrError = await this.decodeInvite(req.log, invite)
    if (inviteOrError.type === 'error') {
      req.log.info('unable to decode this invitation %j', inviteOrError)
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }

    req.log.debug('invite successfully decoded %j', inviteOrError)

    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'companyFound',
          company: inviteOrError.company,
        },
      })
    )
  }

  /**
   * submits the company number for
   */
  @SuccessResponse(200)
  @Post('/create-invitation')
  public async submitNewInvite(
    @Request() req: express.Request,
    @Body()
    body: {
      companyNumber: COMPANY_NUMBER | SOCRATA_NUMBER
      email: EMAIL
      action: 'back' | 'continue' | 'submit'
      registryCountryCode: CountryCode
      selectedRegistry: RegistryType
    }
  ): Promise<HTML> {
    /*
    1. Check if company is valid
    2. Check if we can issue an invitation (i.e. no existing record or we can expire an old one)
    3. Expire the old one
    4. Create new connection record if one doesn't exist
    5. Send a new invitation
    */
    console.log('submitNewInvite', body.action)

    // lookup company by number
    const companyOrError = await this.lookupCompany(
      req.log,

      body.registryCountryCode,
      body.selectedRegistry,
      body.companyNumber
    )
    if (companyOrError.type === 'error') {
      req.log.warn('error creating invitation to company %j', body)
      return this.newInviteErrorHtml(companyOrError.message, body.email, body.companyNumber)
    }
    const company = companyOrError.company

    req.log.debug('company details valid, progressing connection with %j', { company })

    const allowInvitation = await this.allowNewInvitation(req.log, company)
    if (allowInvitation.type === 'error') {
      req.log.warn('error creating new invitation to company %j', body)
      return this.newInviteErrorHtml(allowInvitation.message, body.email, body.companyNumber)
    }

    req.log.debug('new invitation allowed, progressing invitation to %j', { company })

    // if we're not at the final submission return next stage
    const formStage: NewInviteFormStage = submitToFormStage[body.action]
    if (formStage !== 'success') {
      req.log.info('rendering stage [%s] of new connection', formStage)
      return this.newInviteSuccessHtml(formStage, company, body.email)
    }

    req.log.info('new connection details %s (%s)', company.name, company.number)

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      this.cloudagent.createOutOfBandInvite({
        companyName: company.name,
        registryCountryCode: body.registryCountryCode,
      }),
    ])

    req.log.info(`invite created, applying '${allowInvitation.state}' %j`, { company, pinHash, invite })
    const dbResult =
      allowInvitation.state === 'update_existing'
        ? await this.updateExistingConnection(req.log, company, pinHash, invite.outOfBandRecord.id)
        : await this.insertNewConnection(
            company,
            pinHash,
            invite.outOfBandRecord.id,
            null,
            body.registryCountryCode,
            body.selectedRegistry
          )
    if (dbResult.type === 'error') {
      req.log.warn(`unable to apply '${allowInvitation.state}' %j`, dbResult)
      return this.newInviteErrorHtml(dbResult.error, body.email, company.number)
    }

    const wrappedInvitation: Invite = {
      companyNumber: this.env.get('INVITATION_FROM_COMPANY_NUMBER'),
      goalCode: this.env.get('LOCAL_REGISTRY_TO_USE'), // 'search for me in this registry' --> allows the company we're issuing the invite to add the registry if needed
      inviteUrl: invite.invitationUrl,
    }

    req.log.info('sending connection_invite email to %s (%s) %j', body.email, company.name, wrappedInvitation)
    await this.sendNewConnectionEmail(body.email, company.name, wrappedInvitation)
    req.log.info('sending connection_invite_admin email %j', { company, pin })
    await this.sendAdminEmail(company, pin)

    // return the success response
    req.log.info('invitation sent successfully to %s', company.name)
    return this.newInviteSuccessHtml(formStage, company, body.email)
  }

  /**
   * submits the invitation for decoding and connection insertion
   */
  @SuccessResponse(200)
  @Post('/receive-invitation')
  public async submitFromInvite(
    @Request() req: express.Request,
    @Body()
    body: {
      invite: BASE_64_URL | string
      action: 'createConnection'
    }
  ): Promise<HTML> {
    if (body.invite && !body.invite.match(base64UrlRegex)) {
      req.log.warn('invitation is not valid %j', body)
      return this.receiveInviteErrorHtml('Invitation is not valid')
    }

    req.log.info('decoding invite %s', body.invite)
    const inviteOrError = await this.decodeInvite(req.log, body.invite || '')
    if (inviteOrError.type === 'error') {
      req.log.warn('unable to decode invitation %j', inviteOrError)
      return this.receiveInviteErrorHtml(inviteOrError.message)
    }

    req.log.info('new connection: details %s (%s)', inviteOrError.company.name, inviteOrError.company.number)

    // otherwise we're doing final submit. Generate pin and oob invitation
    const pin = randomInt(1e6).toString(10).padStart(6, '0')
    const [pinHash, invite] = await Promise.all([
      argon2.hash(pin, { secret: this.env.get('INVITATION_PIN_SECRET') }),
      this.cloudagent.receiveOutOfBandInvite({
        companyName: inviteOrError.company.name,
        invitationUrl: inviteOrError.inviteUrl,
      }),
    ])

    req.log.info('invite created, inserting new connection %j', { pinHash, invite })
    const dbResult = await this.insertNewConnection(
      inviteOrError.company,
      pinHash,
      invite.outOfBandRecord.id,
      invite.connectionRecord.id,
      inviteOrError.registryCountryCode,
      inviteOrError.company.selectedRegistry // TODO: should we be verifying this or do they send it over?
    )
    if (dbResult.type === 'error') {
      req.log.warn('unable to insert a new connection %j', dbResult)
      return this.receiveInviteErrorHtml(dbResult.error)
    }

    await this.sendAdminEmail(inviteOrError.company, pin)

    req.log.info('new connection: complete: %s', dbResult.connectionId)
    this.setHeader('HX-Replace-Url', `/connection/${dbResult.connectionId}/pin-submission`)
    return this.receivePinSubmissionHtml(dbResult.connectionId)
  }

  private async decodeInvite(
    logger: pino.Logger,
    invite: BASE_64_URL
  ): Promise<
    | { type: 'success'; inviteUrl: string; company: SharedOrganisationInfo; registryCountryCode: CountryCode }
    | { type: 'error'; message: string }
  > {
    let decodedInvite: Invite
    try {
      decodedInvite = inviteParser.parse(JSON.parse(Buffer.from(invite, 'base64url').toString('utf8')))
    } catch (err) {
      logger.info('unknown error occured %j', err)
      return {
        type: 'error',
        message: 'Invitation is not valid, the invite is not in the correct format',
      }
    }

    if (!decodedInvite.companyNumber.match(decodedInvite.goalCode === 'GB' ? companyNumberRegex : socrataRegex)) {
      logger.info('company number did not match a %s regex', companyNumberRegex)
      return {
        type: 'error',
        message: 'Invitation is not valid',
      }
    }
    // check if we have a registry configured for this country
    const registry = await this.db.get('organisation_registries', {
      country_code: decodedInvite.goalCode,
    })
    if (registry.length === 0) {
      logger.info('no registry configured for this country %s', decodedInvite.goalCode)
      return {
        type: 'error',
        message: 'No registry configured for this country',
      }
    }
    // favour country-spec. reqistry
    // TODO: search in all configured registries if needed
    const countryRegistry = registry.filter((registry) => registry.third_party === false)

    const companyOrError = await this.lookupCompany(
      logger,

      decodedInvite.goalCode,
      countryRegistry[0].registry_key,
      decodedInvite.companyNumber
    )
    if (companyOrError.type === 'error') {
      logger.info('companyOrError')
      return companyOrError
    }
    return {
      type: 'success',
      inviteUrl: decodedInvite.inviteUrl,
      company: companyOrError.company,
      registryCountryCode: decodedInvite.goalCode,
    }
  }

  private async lookupCompany(
    logger: pino.Logger,
    registryCountryCode: CountryCode,
    selectedRegistry: RegistryType,
    companyNumber: COMPANY_NUMBER | SOCRATA_NUMBER
  ): Promise<{ type: 'success'; company: SharedOrganisationInfo } | { type: 'error'; message: string }> {
    const companySearch = await this.organisationRegistry.getOrganisationProfileByOrganisationNumber({
      companyNumber,
      registryCountryCode,
      selectedRegistry,
    })
    if (companySearch.type === 'notFound') {
      logger.info('%s company not found', companySearch)
      return {
        type: 'error',
        message: 'Company number does not exist',
      }
    }
    const company = companySearch.company
    logger.info('company by %s number was found %j', companyNumber, company)

    if (company.registeredOfficeIsInDispute) {
      logger.info("company's is in dispute %o", company)
      return {
        type: 'error',
        message: `Cannot validate company ${company.name} as address is currently in dispute`,
      }
    }

    if (company.status !== 'active') {
      logger.info('company is not active %j', company)
      return {
        type: 'error',
        message: `Company ${company.name} is not active`,
      }
    }

    return { type: 'success', company }
  }

  private async allowNewInvitation(
    logger: pino.Logger,
    companyData: SharedOrganisationInfo
  ): Promise<{ type: 'success'; state: 'new_connection' | 'update_existing' } | { type: 'error'; message: string }> {
    const existingConnections = await this.db.get('connection', { company_number: companyData.number })
    // allow to progress if no connection record exists
    if (existingConnections.length === 0) {
      logger.info('returning success - new connection')
      return { type: 'success', state: 'new_connection' }
    }
    // or test whether we're allowed to send a new invitation
    for await (const connection of existingConnections) {
      // error early if verified_both
      if (connection.status === 'verified_both') {
        logger.info('verified connection already exists %s', connection.id)
        return {
          type: 'error',
          message: `Verified connection already exists with organisation ${companyData.name}`,
        }
      }
      // now get invitation records for the connection
      const existingInvitations = await this.db.get('connection_invite', { connection_id: connection.id })
      // error if connection record exists without an invitation record
      if (existingInvitations.length === 0) {
        logger.info('no invitation found for connection record %s', connection.id)
        return {
          type: 'error',
          message: `No invitation found for connection record ${connection.id}`,
        }
      }
      // now check each invitation status
      for (const invitation of existingInvitations) {
        // catch the case where they have verified our invite but we've not verified theirs
        if (connection.status === 'verified_them' && invitation.validity === 'used') {
          logger.info('other party verified, request new pin instead %s', connection.id)
          return {
            type: 'error',
            message: `Other party has already verified, request new pin instead from ${companyData.name}`,
          }
        }
        // now catch rare forbidden states: disconnected & valid, disconnected & too_many_attempts, pending & used
        if (
          (connection.status === 'disconnected' && invitation.validity === 'valid') ||
          (connection.status === 'disconnected' && invitation.validity === 'too_many_attempts') ||
          (connection.status === 'pending' && invitation.validity === 'used')
        ) {
          logger.info('edge case database state detected, aborting %s', connection.id)
          return {
            type: 'error',
            message: `Edge case database state detected for connection ${connection.id}, aborting`,
          }
        }
      }
    }
    // otherwise allowed to submit a new invitation to existing connection
    logger.info('returning success - update existing')
    return { type: 'success', state: 'update_existing' }
  }

  private async updateExistingConnection(
    logger: pino.Logger,
    company: SharedOrganisationInfo,
    pinHash: string,
    invitationId: UUID
  ): Promise<{ type: 'success'; connectionId: UUID } | { type: 'error'; error: string }> {
    try {
      // logic in allowNewInvitation ensures only one entry exists for connectionRecord
      const [connectionRecord] = await this.db.get('connection', { company_number: company.number })
      // to return the connectionId
      const connectionId = connectionRecord.id
      // get invitations array
      // NB we haven't inserted the new invitation into the ui db yet so its OOB invite won't be deleted
      const invitations = await this.db.get('connection_invite', { connection_id: connectionId })
      // delete all existing OOB invitations from the cloudagent
      for (const invite of invitations) {
        const exists = await this.cloudagent.getOutOfBandInvite(invite.oob_invite_id).catch((error) => {
          if (error instanceof NotFoundError) {
            logger.debug('OOB invitation already deleted %s', invite.oob_invite_id)
          } else {
            throw error
          }
        })
        // Make sure we're only deleting invitations we've sent
        if (exists && exists.role === 'sender') {
          await this.cloudagent.deleteOutOfBandInvite(invite.oob_invite_id)
          logger.debug('OOB invitation deleted %s', invite.oob_invite_id)
        }
      }
      // database transactions
      await this.db.withTransaction(async (db) => {
        // leave 'expired' as expired, leave 'too_many_attempts' as too_many_attempts
        // expire existing invitations if they're 'valid' (condition verified_both && valid already aborted in allowNewInvitation)
        await db.update(
          'connection_invite',
          { connection_id: connectionId, validity: 'valid' },
          { expires_at: new Date(), validity: 'expired' }
        )
        // expire existing invitations if they're 'used' (condition verified_them && used, and verified_both && used already aborted in allowNewInvitation)
        await db.update(
          'connection_invite',
          { connection_id: connectionId, validity: 'used' },
          { expires_at: new Date(), validity: 'expired' }
        )
        // reset pin count and invite status to 'pending'
        await db.update(
          'connection',
          { company_number: company.number },
          {
            status: 'pending',
            pin_attempt_count: 0,
            pin_tries_remaining_count: null,
          }
        )
        // create the new invitation record
        await db.insert('connection_invite', {
          connection_id: connectionId,
          oob_invite_id: invitationId,
          pin_hash: pinHash,
          expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
          validity: 'valid',
        })
      })
      return { type: 'success', connectionId }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.endsWith('duplicate key value violates unique constraint "unq_connection_company_number"')
      ) {
        return {
          type: 'error',
          error: `Connection already exists with ${company.name}`,
        }
      } else {
        return {
          type: 'error',
          error: `database errors when expiring invitation records or creating new invitation entry ${err}`,
        }
      }
    }
  }

  private async insertNewConnection(
    company: SharedOrganisationInfo,
    pinHash: string,
    invitationId: UUID,
    agentConnectionId: UUID | null,
    registryCountryCode: CountryCode,
    registryCode: RegistryType
  ): Promise<{ type: 'success'; connectionId: string } | { type: 'error'; error: string }> {
    try {
      let connectionId: UUID = ''
      await this.db.withTransaction(async (db) => {
        const [record] = await db.insert('connection', {
          company_name: company.name,
          company_number: company.number,
          agent_connection_id: agentConnectionId,
          status: 'pending',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          registry_country_code: registryCountryCode,
          registry_code: registryCode,
        })

        await db.insert('connection_invite', {
          connection_id: record.id,
          oob_invite_id: invitationId,
          pin_hash: pinHash,
          expires_at: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
          validity: 'valid',
        })
        connectionId = record.id
      })

      return { type: 'success', connectionId }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.endsWith('duplicate key value violates unique constraint "unq_connection_company_number"')
      ) {
        return {
          type: 'error',
          error: `Connection already exists with ${company.name}`,
        }
      }
      throw err
    }
  }

  private async sendNewConnectionEmail(email: EMAIL, toCompanyName: string, invite: Invite) {
    const fromCompany = await this.organisationRegistry.localOrganisationProfile()
    const inviteBase64 = Buffer.from(JSON.stringify(invite), 'utf8').toString('base64url')

    await neverFail(
      this.email.sendMail('connection_invite', {
        to: email,
        invite: inviteBase64,
        toCompanyName,
        fromCompanyName: fromCompany.name,
      })
    )
  }

  private async sendAdminEmail(company: SharedOrganisationInfo, pin: PIN_CODE | string) {
    await neverFail(
      this.email.sendMail('connection_invite_admin', this.db, this.logger, {
        receiver: company.name,
        address: company.address,
        pin,
      })
    )
  }

  private newInviteSuccessHtml(formStage: NewInviteFormStage, company: SharedOrganisationInfo, email: EMAIL) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'companyFound',
          company,
        },
        formStage: formStage,
        email: email,
        companyNumber: company.number,
      })
    )
  }

  private newInviteErrorHtml(error: string, email?: EMAIL, companyNumber?: COMPANY_NUMBER | SOCRATA_NUMBER) {
    return this.html(
      this.newInvite.newInviteForm({
        feedback: {
          type: 'error',
          error,
        },
        formStage: 'form',
        email,
        companyNumber,
      })
    )
  }

  private receivePinSubmissionHtml(connectionId: UUID) {
    return this.html(
      this.pinSubmission.renderPinForm({
        connectionId,
        continuationFromInvite: true,
      })
    )
  }

  private receiveInviteErrorHtml(message: string) {
    return this.html(
      this.fromInvite.fromInviteForm({
        feedback: {
          type: 'error',
          error: message,
        },
      })
    )
  }
}
