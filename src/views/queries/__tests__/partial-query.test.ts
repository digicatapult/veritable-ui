import { expect } from 'chai'
import { describe } from 'mocha'
import { mockIds } from '../../../controllers/queries/__tests__/helpers.js'
import { ConnectionRow } from '../../../models/db/types.js'
import Templates from '../responseCo2scope3.js'

const templates = new Templates()
const sampleDate = new Date(Date.UTC(2024, 6, 4))
const connectionsExample: ConnectionRow[] = [{}, {}, {}, {}].map((_, i) => ({
  id: `${mockIds.connectionId.substr(0, mockIds.connectionId.length - 1)}${i}`,
  company_name: 'I own you',
  company_number: '3546783',
  status: 'verified_both',
  agent_connection_id: '233495875757',
  pin_attempt_count: 0,
  pin_tries_remaining_count: null,
  created_at: sampleDate,
  updated_at: sampleDate,
}))

describe('Partial Query', () => {
  describe('if partial is set to false', () => {
    it('does not render connections list and leaves quantity input enabled', async () => {
      const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
        formStage: 'form',
        company: {
          company_name: 'VER123',
          company_number: '3456789',
          status: 'verified_both',
          id: mockIds.companyId,
          agent_connection_id: mockIds.agentConnectionId,
          pin_tries_remaining_count: null,
          pin_attempt_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        queryId: mockIds.queryId,
        quantity: 2,
        partial: false,
        connections: connectionsExample,
        productId: 'product-id-test',
      })

      expect(rendered).to.matchSnapshot()
    })
  })

  it('renders partial query table with connections that are verified', async () => {
    const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
      formStage: 'form',
      company: {
        company_name: 'VER123',
        company_number: '3456789',
        status: 'verified_both',
        id: mockIds.companyId,
        agent_connection_id: mockIds.agentConnectionId,
        pin_tries_remaining_count: null,
        pin_attempt_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      queryId: 'query-id-test',
      quantity: 2,
      partial: true,
      connections: connectionsExample,
      productId: 'product-id-test',
    })
    expect(rendered).to.matchSnapshot()
  })
})
