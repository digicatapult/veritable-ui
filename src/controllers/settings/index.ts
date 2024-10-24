import { Body, Get, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import express from 'express'
import { Env } from '../../env/index.js'
import { InternalError } from '../../errors.js'
import Database from '../../models/db/index.js'
import { SettingsRow } from '../../models/db/types.js'
import SettingsTemplates from '../../views/settings/settings.js'
import { HTML, HTMLController } from './../HTMLController.js'
type SettingsDict = {
  admin_email: { setting_value: string; created_at: Date; updated_at: Date }
} & Record<string, { setting_value: string; created_at: Date; updated_at: Date }>

export type SettingsType = {
  company_name: string
  companies_house_number: string
  from_email: string
  postal_address: string
  admin_email: string
}

@injectable()
@Security('oauth2')
@Route('/settings')
@Produces('text/html')
export class SettingsController extends HTMLController {
  constructor(
    private settingsTemplates: SettingsTemplates,
    private db: Database,
    private env: Env
  ) {
    super()
  }

  /**
   * Retrieves the settings
   */
  @SuccessResponse(200)
  @Get('/')
  public async settings(@Request() req: express.Request): Promise<HTML> {
    req.log.trace('rendering settings')
    const settings = await this.db.get('settings', {}, [['updated_at', 'desc']])
    const settingsDict = await this.transformSettingsToDict(settings)
    const set = {
      company_name: 'DIGITAL CATAPULT',
      companies_house_number: this.env.get('INVITATION_FROM_COMPANY_NUMBER'),
      from_email: this.env.get('EMAIL_FROM_ADDRESS'),
      postal_address: 'Some address',
      admin_email: settingsDict.admin_email.setting_value,
    }

    return this.html(this.settingsTemplates.settings(set))
  }

  /**
   * handles PIN code submission form submit action
   * @param body - contains forms inputs
   * @returns
   */
  @SuccessResponse(200)
  @Post('/update/:edit?')
  public async updateSettings(
    @Request() req: express.Request,
    @Body()
    body: {
      admin_email: string
      company_name: string
      companies_house_number: string
      postal_address: string
      from_email: string
      action?: 'updateSettings'
    },
    @Query('edit') edit?: boolean
  ) {
    req.log.debug('settings update POST request body %o', { body })
    if (!edit == false) {
      if (edit === true) {
        if (body.action == 'updateSettings') {
          await this.db.update('settings', { setting_key: 'admin_email' }, { setting_value: body.admin_email })
        } else {
          req.log.debug('body.action value is incorrect: %s', body.action)
          throw new InternalError('You tried to update settings but something went wrong.')
        }
      } else {
        req.log.error('Failed to edit settings')
        throw new InternalError('Failed in edit.')
      }
    } else {
      req.log.error('Failed to edit settings, edit is set to %s', edit)
      throw new InternalError('Edit failed.')
    }
    const settings = await this.db.get('settings', {}, [['updated_at', 'desc']])
    const settingsDict = await this.transformSettingsToDict(settings)
    const set = {
      company_name: 'DIGITAL CATAPULT',
      companies_house_number: this.env.get('INVITATION_FROM_COMPANY_NUMBER'),
      from_email: this.env.get('EMAIL_FROM_ADDRESS'),
      postal_address: 'Some address',
      admin_email: settingsDict.admin_email.setting_value,
    }

    return this.html(this.settingsTemplates.settingsForm({ settingsProps: set, edit: !edit }))
  }

  private async transformSettingsToDict(settings: SettingsRow[]): Promise<SettingsDict> {
    return settings.reduce((acc, { setting_key, setting_value, created_at, updated_at }) => {
      acc[setting_key] = {
        setting_value,
        created_at,
        updated_at,
      }
      return acc
    }, {} as SettingsDict)
  }
}
