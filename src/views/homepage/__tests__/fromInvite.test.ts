import { expect } from 'chai'
import { describe, it } from 'mocha'

import HomepageTemplates from '../homepage.js'

describe('HomepageTemplates', () => {
  it('should render homepage', async () => {
    const templates = new HomepageTemplates()
    const rendered = await templates.homepage()
    expect(rendered).to.matchSnapshot()
  })
})
