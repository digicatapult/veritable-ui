import { expect } from 'chai'
import { describe, it } from 'mocha'

import { Credential } from '../../../models/veritableCloudagent.js'
import CredentialsTemplates from '../index.js'
import { AliceCredentials, BobCredentials } from './fixtures.js'

describe('CredentialsTemplates', () => {
  describe('listPage', () => {
    it('renders with no credentials', async () => {
      const templates = new CredentialsTemplates()
      const rendered = await templates.listPage([])
      expect(rendered).to.matchSnapshot()
    })

    it("renders alice's credentials", async () => {
      const templates = new CredentialsTemplates()
      const rendered = await templates.listPage(AliceCredentials as Credential[])
      expect(rendered).to.matchSnapshot()
    })

    it("renders bob's credentials", async () => {
      const templates = new CredentialsTemplates()
      const rendered = await templates.listPage(BobCredentials as Credential[])
      expect(rendered).to.matchSnapshot()
    })

    describe('credentials case insensitive searches', () => {
      it('filters based on lower case input', async () => {
        const templates = new CredentialsTemplates()
        const rendered = await templates.listPage(AliceCredentials as Credential[], 'digi')

        expect(rendered.includes('DIGITAL CATAPULT')).to.equal(true)
        expect(rendered).to.matchSnapshot()
      })

      it('filters based on upper case input', async () => {
        const templates = new CredentialsTemplates()
        const rendered = await templates.listPage(AliceCredentials as Credential[], 'CARE')

        expect(rendered.includes('CARE')).to.equal(true)
        expect(rendered).to.matchSnapshot()
      })
    })
  })
})
