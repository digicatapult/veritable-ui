import { expect } from 'chai'
import { describe } from 'mocha'
import { ConnectionRow } from '../../../models/db/types.js'
import Scope3CarbonConsumptionResponseTemplates from '../responseCo2scope3.js'

const sampleDate = new Date(Date.UTC(2024, 6, 4))
const connectionsExample: ConnectionRow[] = [
  {
    id: 'someId',
    company_name: '<div>I own you</div>',
    company_number: '3546783',
    status: 'verified_both',
    agent_connection_id: '233495875757',
    pin_attempt_count: 0,
    pin_tries_remaining_count: null,
    created_at: sampleDate,
    updated_at: sampleDate,
  },
]

describe('Partial Query', () => {
  it('renders partial query table with connections that are verified', async () => {
    const templates = new Scope3CarbonConsumptionResponseTemplates()
    const rendered = await templates.newScope3CarbonConsumptionResponseFormPage({
      formStage: 'form',
      company: {
        company_name: 'VER123',
        company_number: '3456789',
        status: 'verified_both',
        id: 'aa000000-0000-0000-0000-aabbccddee00',
        agent_connection_id: 'agentId',
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
