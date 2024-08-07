import { expect } from 'chai'
import { describe, it } from 'mocha'

import { ConnectionRow } from '../../../models/db/types.js'
import ConnectionTemplates from '../connection.js'

describe('ConnectionTemplates', () => {
  describe('listPage', () => {
    it('should render with no connections', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([])
      expect(rendered).to.matchSnapshot()
    })

    it('should render with single connection', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          company_name: 'Company A',
          status: 'disconnected',
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })

    it('should escape html in name', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          company_name: '<div>I own you</div>',
          status: 'verified_both',
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })

    it('should render multiple with each status', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          company_name: 'Company A',
          status: 'disconnected',
        },
        {
          company_name: 'Company B',
          status: 'pending',
        },
        {
          company_name: 'Company C',
          status: 'unverified',
        },
        {
          company_name: 'Company D',
          status: 'verified_both',
        },
        {
          company_name: 'Company E',
          status: 'verified_them',
        },
        {
          company_name: 'Company F',
          status: 'verified_us',
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })
  })
})
