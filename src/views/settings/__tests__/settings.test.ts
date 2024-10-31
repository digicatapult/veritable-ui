import { expect } from 'chai'
import { describe, it } from 'mocha'
import SettingsTemplates from '../settings.js'

describe('SettingsTemplates', () => {
  describe('settings', () => {
    it('should render settings page', async () => {
      const templates = new SettingsTemplates()
      const rendered = await templates.settings({
        company_name: 'Test Company Name',
        companies_house_number: '0000000',
        from_email: 'mail@testmail.com',
        postal_address: 'Some Address, Somewhere',
        admin_email: 'admin@testmail.com',
      })
      expect(rendered).to.matchSnapshot()
    })
    it('should escape html in name', async () => {
      const templates = new SettingsTemplates()
      const rendered = await templates.settings({
        company_name: '<div>Test Company Name<div/>',
        companies_house_number: '0000000',
        from_email: 'mail@testmail.com',
        postal_address: 'Some Address, Somewhere',
        admin_email: 'admin@testmail.com',
      })
      expect(rendered).to.matchSnapshot()
    })
  })
})
