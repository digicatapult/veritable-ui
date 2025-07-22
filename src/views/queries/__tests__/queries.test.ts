import { expect } from 'chai'
import { describe, it } from 'mocha'
import QueriesTemplates from '../queries.js'

describe('QueriesTemplates', () => {
  describe('chooseQueryPage', () => {
    it('should render queries to select', async () => {
      const templates = new QueriesTemplates()
      const rendered = await templates.chooseQueryPage()
      expect(rendered).to.matchSnapshot()
    })
  })
})
