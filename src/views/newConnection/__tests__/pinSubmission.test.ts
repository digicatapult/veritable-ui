import { expect } from 'chai'
import { describe, it } from 'mocha'

import { PinSubmissionTemplates } from '../pinSubmission.js'

describe('PinSubmissionTemplates', () => {
  describe('show form', () => {
    it('should render form as a continuation of from invite', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm({ connectionId: 'CONNECTION_ID', continuationFromInvite: true })
      expect(rendered).to.matchSnapshot()
    })

    it('should render form as a stand alone flow', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm({ connectionId: 'CONNECTION_ID', continuationFromInvite: false })
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with PIN', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm({
        connectionId: 'CONNECTION_ID',
        continuationFromInvite: true,
        pin: '123456',
      })
      expect(rendered).to.matchSnapshot()
    })
  })
})
