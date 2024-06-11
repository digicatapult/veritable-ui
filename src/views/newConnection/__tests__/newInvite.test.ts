import { expect } from 'chai'
import { describe, it } from 'mocha'

import { NewInviteTemplates } from '../newInvite.js'
import { successResponse, testErrorTargetBox, testMessageTargetBox, testSuccessTargetBox } from './fixtures.js'

describe('NewInviteTemplates', () => {
  describe('show form', () => {
    it('should render form with a error message and invalid response', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteForm({ feedback: testMessageTargetBox, formStage: 'form' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with a valid response', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteForm({ feedback: testSuccessTargetBox, formStage: 'form' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a confirmation page with given email and company number', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteForm({
        feedback: testSuccessTargetBox,
        formStage: 'confirmation',
        email: '123@123.com',
        companyNumber: successResponse.company_number,
      })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a success response page with a single button to return to home', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteForm({ feedback: testSuccessTargetBox, formStage: 'success' })
      expect(rendered).to.matchSnapshot()
    })

    it('should a web page with the a form in an empty state', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteFormPage(testMessageTargetBox)
      expect(rendered).to.matchSnapshot()
    })

    it('should a web page with the a form in an error state', async () => {
      const templates = new NewInviteTemplates()
      const rendered = await templates.newInviteFormPage(testErrorTargetBox)
      expect(rendered).to.matchSnapshot()
    })
  })
})
