import { expect } from 'chai'
import { describe } from 'mocha'
import { mockIds } from '../../../controllers/queries/__tests__/helpers.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import { CountryCode } from '../../../models/strings.js'
import QueryResponseTemplates from '../queryResponse.js'

const templates = new QueryResponseTemplates()
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
  registry_country_code: 'GB' as CountryCode,
}))

const queryExample: QueryRow = {
  id: 'aaaaaaaa-0001-0000-0000-d8ae0805059e',
  connection_id: 'cccccccc-0001-0000-0000-d8ae0805059e',
  type: 'total_carbon_embodiment',
  parent_id: '5390af91-c551-4d74-b394-d8ae0805059a',
  status: 'resolved',
  details: {
    subjectId: {
      idType: 'product_and_quantity',
      content: { productId: 'partial-product-id', quantity: 10 },
    },
  },
  response_id: null,
  response: null,
  role: 'requester',
  created_at: new Date(),
  updated_at: new Date(),
  expires_at: new Date(),
}

describe('Partial Query', () => {
  describe('if partial is set to false', () => {
    it('does not render connections list and leaves quantity input enabled', async () => {
      const rendered = await templates.queryResponsePage({
        formStage: 'form',
        connection: {
          company_name: 'VER123',
          company_number: '3456789',
          status: 'verified_both',
          id: mockIds.companyId,
          agent_connection_id: mockIds.agentConnectionId,
          pin_tries_remaining_count: null,
          pin_attempt_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
          registry_country_code: 'GB' as CountryCode,
        },
        type: 'total_carbon_embodiment',
        query: queryExample,
        partial: false,
        connections: connectionsExample,
      })

      expect(rendered).to.matchSnapshot()
    })
  })

  it('renders partial query table with connections that are verified', async () => {
    const rendered = await templates.queryResponsePage({
      formStage: 'form',
      connection: {
        company_name: 'VER123',
        company_number: '3456789',
        status: 'verified_both',
        id: mockIds.companyId,
        agent_connection_id: mockIds.agentConnectionId,
        pin_tries_remaining_count: null,
        pin_attempt_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        registry_country_code: 'GB' as CountryCode,
      },
      type: 'total_carbon_embodiment',
      query: queryExample,
      partial: true,
      connections: connectionsExample,
    })
    expect(rendered).to.matchSnapshot()
  })
})
