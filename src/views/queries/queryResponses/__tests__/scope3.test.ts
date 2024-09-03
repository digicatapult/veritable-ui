import { expect } from 'chai'
import { describe } from 'mocha'
import Scope3CarbonConsumptionResponseTemplates from '../scope3.js'
import Scope3CarbonConsumptionViewResponseTemplates from '../viewResponseToScope3.js'

describe('QueryResponseTemplates', () => {
  describe('newScope3CarbonConsumptionResponseFormPage Tests', () => {
    it('should render with test data', async () => {
      const templates = new Scope3CarbonConsumptionResponseTemplates()
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: {
          company_name: 'UNIT_TEST-01 ',
          company_number: '3456789',
          status: 'verified_both',
          id: '12155635-40ef-4bdb-1111-111111111111',
          agent_connection_id: '12155635-40ef-4bdb-0000-111111111111',
          pin_tries_remaining_count: 4,
          pin_attempt_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        queryId: '12155635-40ef-4bdb-2222-111111111111',
        partial: true,
        connections: [],
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
        productId: 'product-id-test-escape',
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
        },
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
      },
    })
    expect(rendered).to.matchSnapshot()
  })
})
describe('viewing query response Tests', () => {
  const sampleDate = new Date(Date.UTC(2024, 6, 4))
  it('should render resolved query to view response', async () => {
    const templates = new Scope3CarbonConsumptionViewResponseTemplates()
    const rendered = await templates.scope3CarbonConsumptionViewResponsePage({
      id: '11',
      company_name: 'VER123',
      query_type: 'Scope 3 query',
      updated_at: sampleDate,
      status: 'resolved',
      role: 'requester',
      quantity: '430',
      productId: 'jkl333',
      emissions: '5678',
    })
    expect(rendered).to.matchSnapshot()
  })
  it('shouldexcape html resolved query to view response', async () => {
    const templates = new Scope3CarbonConsumptionViewResponseTemplates()
    const rendered = await templates.scope3CarbonConsumptionViewResponsePage({
      id: '11',
      company_name: '<div>VER123</div>',
      query_type: 'Scope 3 query',
      updated_at: sampleDate,
      status: 'resolved',
      role: 'requester',
      quantity: '<div>430</div>',
      productId: 'jkl333',
      emissions: '5678',
    })
    expect(rendered).to.matchSnapshot()
  })
})
