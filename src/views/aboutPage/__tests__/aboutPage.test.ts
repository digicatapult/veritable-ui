import { expect } from 'chai'
import { describe, it } from 'mocha'
import AboutPageTemplates from '../about.js'

describe('AboutPageTemplates', () => {
  it('should render about page', async () => {
    const templates = new AboutPageTemplates()
    const rendered = await templates.aboutPage()
    expect(rendered).to.matchSnapshot()
  })
})
