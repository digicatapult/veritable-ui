import { singleton } from 'tsyringe'
import { Page } from '../common.js'

@singleton()
export default class HomepageTemplates {
  constructor() {}
  public homepage = () => {
    return (
      <Page
        title="Veritable - Homepage"
        heading="Homepage"
        activePage="categories"
        headerLinks={[{ name: '', url: '/' }]}
        stylesheets={['homepage.css']}
      >
        <div id="homepage-container">
          <a href="/queries">
            <img src="/public/images/send.svg" />
            <h1>Queries</h1>
            <p>Ask and answer digitally verified questions from any of your contacts.</p>
          </a>
          <a href="#">
            <img src="/public/images/layers.svg" />
            <h1>Certifications</h1>
            <p>Manage and verify digital certifications securely within your network.</p>
          </a>
          <a href="/connection">
            <img src="/public/images/user-check.svg" />
            <h1>Onboard/Refer</h1>
            <p>Easily onboard new companies or refer companies to join your network.</p>
          </a>
          <a href="#">
            <img src="/public/images/settings.svg" />
            <h1>Settings</h1>
            <p>Manage your account preferences and profile settings.</p>
          </a>
        </div>
      </Page>
    )
  }
}
