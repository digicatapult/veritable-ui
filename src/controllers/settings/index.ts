import { Body, Get, Post, Produces, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { injectable } from 'tsyringe'

import express from 'express'
import Database from '../../models/db/index.js'
import { SettingsRow } from '../../models/db/types.js'
import SettingsTemplates from '../../views/settings/settings.js'
import { HTML, HTMLController } from './../HTMLController.js'
export type SettingsDict = {
  company_name: { setting_value: string; created_at: Date; updated_at: Date }
  companies_house_number: { setting_value: string; created_at: Date; updated_at: Date }
  email: { setting_value: string; created_at: Date; updated_at: Date }
  postal_address: { setting_value: string; created_at: Date; updated_at: Date }
  from_email: { setting_value: string; created_at: Date; updated_at: Date }
  admin_email: { setting_value: string; created_at: Date; updated_at: Date }
} & Record<string, { setting_value: string; created_at: Date; updated_at: Date }> // are we concerned about additional fields?

@injectable()
@Security('oauth2')
@Route('/settings')
@Produces('text/html')
export class SettingsController extends HTMLController {
  constructor(
    private settingsTemplates: SettingsTemplates,
    private db: Database
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

    return this.html(this.settingsTemplates.settings(settingsDict))
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
    console.log('edit: ', edit)
    await this.db.update('settings', { setting_key: 'admin_email' }, { setting_value: body.admin_email })
    const settings = await this.db.get('settings', {}, [['updated_at', 'desc']])
    const settingsDict = await this.transformSettingsToDict(settings)

    return this.html(this.settingsTemplates.settingsForm({ settingsProps: settingsDict, edit: !edit }))
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
