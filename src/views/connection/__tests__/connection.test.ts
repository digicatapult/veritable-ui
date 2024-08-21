import { expect } from 'chai'
import { describe, it } from 'mocha'

import { ConnectionRow } from '../../../models/db/types.js'
import ConnectionTemplates from '../connection.js'

describe('ConnectionTemplates', () => {
  describe('listPage', () => {
    const sampleDate = new Date(Date.UTC(2024, 6, 4))

    it('should render with no connections', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([])
      expect(rendered).to.matchSnapshot()
    })

    it('should render with single connection', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          id: 'someId',
          company_name: 'Company A',
          company_number: '3546783',
          status: 'disconnected',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })

    it('should escape html in name', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          id: 'someId',
          company_name: '<div>I own you</div>',
          company_number: '3546783',
          status: 'verified_both',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })

    it('should render multiple with each status', async () => {
      const templates = new ConnectionTemplates()
      const rendered = await templates.listPage([
        {
          id: 'someId',
          company_name: 'Company A',
          company_number: '3546783',
          status: 'disconnected',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
        {
          id: 'someId',
          company_name: 'Company B',
          company_number: '3546783',
          status: 'pending',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
        {
          id: 'someId',
          company_name: 'Company C',
          company_number: '3546783',
          status: 'unverified',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
        {
          id: 'someId',
          company_name: 'Company D',
          company_number: '3546783',
          status: 'verified_both',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
        {
          id: 'someId',
          company_name: 'Company E',
          company_number: '3546783',
          status: 'verified_them',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
        {
          id: 'someId',
          company_name: 'Company F',
          company_number: '3546783',
          status: 'verified_us',
          agent_connection_id: '233495875757',
          pin_attempt_count: 0,
          pin_tries_remaining_count: null,
          created_at: sampleDate,
          updated_at: sampleDate,
        },
      ] as ConnectionRow[])
      expect(rendered).to.matchSnapshot()
    })
  })
})
