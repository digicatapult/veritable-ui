import { expect } from 'chai'
import { describe, it } from 'mocha'

import { FromInviteTemplates } from '../fromInvite.js'
import { testErrorTargetBox, testMessageTargetBox, testSuccessTargetBox } from './fixtures.js'

describe('FromInviteTemplates', () => {
  describe('show form', () => {
    it('should render form with a error message and invalid response', async () => {
      const templates = new FromInviteTemplates()
      const rendered = await templates.fromInviteForm({ feedback: testMessageTargetBox })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a web page with the a form in an empty state', async () => {
      const templates = new FromInviteTemplates()
      const rendered = await templates.fromInviteFormPage(testSuccessTargetBox)
      expect(rendered).to.matchSnapshot()
    })

    it('should render a web page with the a form in an empty state', async () => {
      const templates = new FromInviteTemplates()
      const rendered = await templates.fromInviteFormPage(testMessageTargetBox)
      expect(rendered).to.matchSnapshot()
    })

    it('should render a web page with the a form in an error state', async () => {
      const templates = new FromInviteTemplates()
      const rendered = await templates.fromInviteFormPage(testErrorTargetBox)
      expect(rendered).to.matchSnapshot()
    })
  })
})
