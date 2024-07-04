import { expect } from 'chai'
import { describe, it } from 'mocha'
import QueriesTemplates from '../queries.js'
describe('ConnectionTemplates', () => {
  describe('listPage', () => {
    it('should render with no connections', async () => {
      const templates = new QueriesTemplates()
      const rendered = await templates.chooseQueryPage()
      expect(rendered).to.matchSnapshot()
    })
  })
})
