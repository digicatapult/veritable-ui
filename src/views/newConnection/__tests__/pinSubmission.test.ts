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
    it('should render form with error message on pin', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm({
        connectionId: 'CONNECTION_ID',
        continuationFromInvite: true,
        pin: '123456',
        remainingTries: 'There has been an issue, remaining tries: 5',
      })
      expect(rendered).to.matchSnapshot()
    })
  })
  describe('show sucess screen', () => {
    it('should render sucess form ', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderSuccess({
        companyName: 'CompanyName',
        stepCount: 3,
      })
      expect(rendered).to.matchSnapshot()
    })
    it('should render success form with error message on pin tries', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderSuccess({
        companyName: 'CompanyName',
        stepCount: 3,
        errorMessage: 'The limit on pin tries has been exceeded.',
      })
      expect(rendered).to.matchSnapshot()
    })
  })
})
