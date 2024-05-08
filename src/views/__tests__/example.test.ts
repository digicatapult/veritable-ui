import { describe, it } from 'mocha'

import ExampleTemplates from '../example'

describe('RootTemplates', async () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  describe('Root', () => {
    it('should render root page', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Root('title', 0)
      expect(rendered).to.matchSnapshot()
    })

    it('should escape html in title', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Root('<div>Malicious Content</div>', 0)
      expect(rendered).to.matchSnapshot()
    })

    it('should render counter 1 on second load', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Root('title', 1)
      expect(rendered).to.matchSnapshot()
    })
  })

  describe('Counter', () => {
    it('should render the counter with value 0', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Counter({ count: 0 })
      expect(rendered).to.matchSnapshot()
    })

    it('should render the counter on second call with value 1', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Counter({ count: 1 })
      expect(rendered).to.matchSnapshot()
    })
  })

  describe('Button', () => {
    it('should render the enabled button', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Button({ disabled: false })
      expect(rendered).to.matchSnapshot()
    })

    it('should render the disabled button', async () => {
      const templates = new ExampleTemplates()
      const rendered = await templates.Button({ disabled: true })
      expect(rendered).to.matchSnapshot()
    })
  })
})
