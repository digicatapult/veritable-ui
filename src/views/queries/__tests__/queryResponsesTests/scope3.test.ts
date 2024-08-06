import { expect } from 'chai'
import { describe } from 'mocha'
import Scope3CarbonConsumptionResponseTemplates from '../../queryResponses/scope3.js'

describe('QueryResponseTemplates', () => {
  describe('newScope3CarbonConsumptionResponseFormPage Tests', () => {
    it('should render with test data', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage(
        'form',
        {
          companyName: 'test name',
          companyNumber: '345test',
        },
        2,
        '05867ccc'
      )
      expect(rendered).to.matchSnapshot()
    })
    it('should escape html in name', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage(
        'form',
        {
          companyName: '<div>I own you</div>',
          companyNumber: '345test',
        },
        2,
        '05867ccc'
      )
      expect(rendered).to.matchSnapshot()
    })
  })
  describe('newQuerySuccess Tests', () => {
    it('should render sucess query response page', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage('success', {
        companyName: 'test name',
        companyNumber: '345test',
      })
      expect(rendered).to.matchSnapshot()
    })

    //should there be an error response?
  })
})
