import { expect } from 'chai'
import { describe, it } from 'mocha'
import QueryListTemplates from '../queriesList.js'

describe('ConnectionTemplates', () => {
  const sampleDate = new Date()

  describe('listPage', () => {
    it('should render with no connections', async () => {
      const templates = new QueryListTemplates()
      const rendered = await templates.listPage([])
      expect(rendered).to.matchSnapshot()
    })
    it('should render with single query', async () => {
      const templates = new QueryListTemplates()
      const rendered = await templates.listPage([
        {
          company_name: 'Company A',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
      ])
      expect(rendered).to.matchSnapshot()
    })
    it('should escape html in name', async () => {
      const templates = new QueryListTemplates()
      const rendered = await templates.listPage([
        {
          company_name: '<div>I own you</div>',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
      ])
      expect(rendered).to.matchSnapshot()
    })
    it('should render multiple with each status', async () => {
      const templates = new QueryListTemplates()
      const rendered = await templates.listPage([
        {
          company_name: 'Company A',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
        {
          company_name: 'Company B',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
        {
          company_name: 'Company C',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
        {
          company_name: 'Company D',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
        {
          company_name: 'Company E',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
        {
          company_name: 'Company F',
          status: 'resolved',
          query_type: 'Type A',
          updated_at: sampleDate,
        },
      ])
      expect(rendered).to.matchSnapshot()
    })
  })
})
