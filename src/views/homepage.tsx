import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { Page } from './common.js'

@singleton()
export default class HomepageTemplates {
  constructor() {}
  public homepage = () => {
    return (
      <Page title="Veritable - Homepage" heading="Homepage" headerLinks={[{ name: '', url: '/' }]}>
        <div
          class="main connections"
          hx-get="/"
          hx-trigger="every 10s"
          hx-select="#search-results"
          hx-target="#search-results"
          hx-swap="outerHTML"
          hx-include="#connection-search-input"
        ></div>
        <div class="center-category">
          <div class="category-container">
            <div class="category-item">
              <div class="category-align-in-row">
                <img class=" category-icon" src="/public/images/send.svg" />
                <h1 class="category-header">Queries</h1>
              </div>
              <p class="category-text">Ask and answer digitally verified questions from any of your contacts.</p>
            </div>
            <div class="category-item">
              <div class="category-align-in-row">
                <img class="category-icon" src="/public/images/layers.svg" />
                <h1 class="category-header">Certifications</h1>
              </div>
              <p class="category-text">Manage and verify digital certifications securely within your network.</p>
            </div>
            <div class="category-item">
              <div class="category-align-in-row">
                <img class="category-icon" src="/public/images/user-check.svg" />
                <h1 class="category-header">Onboard/Refer</h1>
              </div>
              <p class="category-text">Easily onboard new companies or refer companies to join your network.</p>
            </div>
            <div class="category-item">
              <div class="category-align-in-row">
                <img class="category-icon" src="/public/images/settings.svg" />
                <h1 class="category-header">Settigns</h1>
              </div>
              <p class="category-text">Manage your account preferences and profile settigns.</p>
            </div>
          </div>
        </div>
      </Page>
    )
  }
}
