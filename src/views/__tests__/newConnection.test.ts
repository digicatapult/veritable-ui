import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  successResponse,
  testErrorTargetBox,
  testSuccessTargetBox,
} from '../../models/__tests__/fixtures/companyHouseFixtures.js'
import NewConnectionTemplates from '../newConnection.js'

describe('NewConnectionTemplates', () => {
  describe('show form', () => {
    it('should render Error message with text error test', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyEmptyTextBox({ errorMessage: 'error test' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a valid company in filled company test box', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyFilledTextBox({ company: successResponse })
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with a errormessage and invlaid response', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyFormInput({ targetBox: testErrorTargetBox, formStage: 'form' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render form with a valid repsponse', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyFormInput({ targetBox: testSuccessTargetBox, formStage: 'form' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a confirmation page with given email and company number', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyFormInput({
        targetBox: testSuccessTargetBox,
        formStage: 'confirmation',
        email: '123@123.com',
        companyNumber: successResponse.company_number,
      })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a success response page with a single button to return to home', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.companyFormInput({ targetBox: testSuccessTargetBox, formStage: 'success' })
      expect(rendered).to.matchSnapshot()
    })

    it('should a web page with the a form in an empty state', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.formPage(testErrorTargetBox, 'form')
      expect(rendered).to.matchSnapshot()
    })

    it('should render a stepper html at stage 1', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.stepper({ formStage: 'form' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a stepper html at stage 2', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.stepper({ formStage: 'confirmation' })
      expect(rendered).to.matchSnapshot()
    })

    it('should render a stepper html at stage 3', async () => {
      const templates = new NewConnectionTemplates()
      const rendered = await templates.stepper({ formStage: 'success' })
      expect(rendered).to.matchSnapshot()
    })
  })
})
