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
          <a href="/connection">
            <img src="/public/images/connection.svg" />
            <h1>Onboard/Refer</h1>
            <p>Easily onboard new companies or refer companies to join your network.</p>
          </a>
          <a href="/queries">
            <img src="/public/images/query.svg" />
            <h1>Queries</h1>
            <p>Ask and answer digitally verified questions from any of your contacts.</p>
          </a>
          <a href="/credentials">
            <img src="/public/images/credential.svg" />
            <h1>Credentials</h1>
            <p>Manage and verify digital credentials securely within your network.</p>
          </a>
          <a href="#" class="disabled">
            <img src="/public/images/setting.svg" />
            <h1>Settings</h1>
            <p>Manage your account preferences and profile settings.</p>
          </a>
        </div>
      </Page>
    )
  }
}
