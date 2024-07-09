import { expect } from 'chai'
import { describe, it } from 'mocha'

import { invalidCompanyNumber, validCompanyNumber } from '../../../controllers/connection/__tests__/fixtures.js'
import { PinSubmissionTemplates } from '../pinSubmission.js'

describe('NewInviteTemplates', () => {
  describe('show form', () => {
    it('should render form with a error message and invalid response', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm(validCompanyNumber)
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with a valid response', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm(invalidCompanyNumber)
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with a valid response', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderPinForm(validCompanyNumber, '123456')
      expect(rendered).to.matchSnapshot()
    })

    it('should render a web page with the a form in an empty state', async () => {
      const templates = new PinSubmissionTemplates()
      const rendered = await templates.renderSuccess('submitPinCode', '123456', validCompanyNumber)
      expect(rendered).to.matchSnapshot()
    })
  })
})
