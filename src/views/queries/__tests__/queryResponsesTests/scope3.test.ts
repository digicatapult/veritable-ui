import { expect } from 'chai'
import { describe } from 'mocha'
import Scope3CarbonConsumptionResponseTemplates from '../../queryResponses/scope3.js'

describe('QueryResponseTemplates', () => {
  describe('newScope3CarbonConsumptionResponseFormPage Tests', () => {
    it('should render with test data', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: {
          company_name: 'VER123',
          company_number: '3456789',
          status: 'verified_both',
          id: '11',
          agent_connection_id: 'agentId',
          pin_tries_remaining_count: null,
          pin_attempt_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        queryId: 'query-id-test',
        quantity: 2,
        productId: 'product-id-test'
    })
      expect(rendered).to.matchSnapshot()
    })
    it('should escape html in name', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: {
          company_name: '<div>I own you</div>',
          company_number: '3456789',
          status: 'verified_both',
          id: '11',
          agent_connection_id: 'agentId',
          pin_tries_remaining_count: null,
          pin_attempt_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        queryId: 'query-id-test-escape',
        quantity: 2,
        productId: 'product-id-test-escape'
      })
      expect(rendered).to.matchSnapshot()
    })
  })
  describe('newQuerySuccess Tests', () => {
    it('should render sucess query response page', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'success',
        company: {
          company_name: 'VER123',
          company_number: '3456789',
          status: 'verified_both',
          id: '11',
          agent_connection_id: 'agentId',
          pin_tries_remaining_count: null,
          pin_attempt_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }
      })
      expect(rendered).to.matchSnapshot()
    })
  })
  it('should escape html in name', async () => {
    const templates = new Scope3CarbonConsumptionResponseTemplates()
    const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
      formStage: 'success',
        company: {
        company_name: '<div>I own you</div>',
        company_number: '3456789',
        status: 'verified_both',
        id: '11',
        agent_connection_id: 'agentId',
        pin_tries_remaining_count: null,
        pin_attempt_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }
    })
    expect(rendered).to.matchSnapshot()
  })
})
