import { expect } from 'chai'
import { describe, test } from 'mocha'
import { ConnectionRow } from '../../../models/db/types.js'
import Scope3CarbonConsumptionTemplates from '../requestCo2scope3.js'

describe('Scope3CarbonConsumptionTemplates', () => {
  describe('newScope3CarbonConsumptionFormPage', () => {
    test('companySelect with companies', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
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
      })
      expect(rendered).to.matchSnapshot()
    })

    test('companySelect with no companies', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
        formStage: 'companySelect',
        connections: [],
        search: 'search-text',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('form without product and quantity inputs', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
        formStage: 'form',
        connectionId: 'connection-id',
      })
      expect(rendered).to.matchSnapshot()
    })

    test('form with product and quantity inputs', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
        formStage: 'form',
        connectionId: 'connection-id',
        productId: 'product-id',
        quantity: 123,
      })
      expect(rendered).to.matchSnapshot()
    })

    test('success', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
        formStage: 'success',
        company: {
          company_name: 'company1',
        },
      })
      expect(rendered).to.matchSnapshot()
    })

    test('error', async () => {
      const templates = new Scope3CarbonConsumptionTemplates()
      const rendered = await templates.newScope3CarbonConsumptionFormPage({
        formStage: 'error',
        company: {
          companyName: 'company1',
          companyNumber: '111111111',
        },
      })
      expect(rendered).to.matchSnapshot()
    })
  })
})
