import { expect } from 'chai'
import { describe, test } from 'mocha'
import { ConnectionRow } from '../../../models/db/types.js'
import QueryRequestTemplates from '../queryRequest.js'

const connection = { id: 'connection-id', company_name: 'company-name' } as ConnectionRow

describe('QueryRequestTemplates', () => {
  describe('newQueryRequestPage', () => {
    test('companySelect with companies', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'companySelect',
        connections: [
          {
            id: '1',
            company_name: 'company1',
            company_number: '111111111',
          },
          {
            id: '2',
            company_name: 'company2',
            company_number: '222222222',
          },
        ] as ConnectionRow[],
        search: 'search-text',
        type: 'total_carbon_embodiment',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('companySelect with no companies', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'companySelect',
        connections: [],
        search: 'search-text',
        type: 'total_carbon_embodiment',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('carbon embodiment form without product and quantity inputs', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'form',
        connection,
        type: 'total_carbon_embodiment',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('bav form', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'form',
        connection,
        type: 'beneficiary_account_validation',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('success', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'success',
        company: {
          companyName: 'company1',
        },
        type: 'total_carbon_embodiment',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('error', async () => {
      const templates = new QueryRequestTemplates()
      const rendered = await templates.newQueryRequestPage({
        formStage: 'error',
        company: {
          companyName: 'company1',
        },
        type: 'total_carbon_embodiment',
      })
      expect(rendered).to.matchSnapshot()
    })
  })
})
