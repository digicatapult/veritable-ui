import { singleton } from 'tsyringe'
import { Page } from '../common.js'

@singleton()
export default class AboutPageTemplates {
  constructor() {}
  public aboutPage = () => {
    return (
      <Page
        title="Veritable - About"
        heading="About Veritable"
        activePage="categories"
        headerLinks={[{ name: '', url: '/' }]}
        stylesheets={['about.css']}
      >
        <div id="about-container">
          <img src="/public/images/logo-square.svg" />
          <h3>About Veritable </h3>
          <p>
            Veritable is a platform that enhances trust and transparency in supply chains through secure,
            privacy-preserving data sharing and process automation. With verified digital identities, automated queries,
            and credential management, Veritable enables verified participants to collaborate with confidence,
            safeguarding sensitive information and ensuring compliance.
          </p>
          <div id="key-features-container">
            <h3>Key Features</h3>
            <div class="in-row">
              <h3>Verified Onboarding: </h3>
              <p> Verifies all participants, building trust across the supply chain.</p>
            </div>
            <div class="in-row">
              <h3>Automated Queries:</h3>
              <p>Enables seamless data requests and responses.</p>
            </div>
            <div class="in-row">
              <h3>Credential Management: </h3>
              <p>Manages and verifies digital credentials for compliance.</p>
            </div>
            <div class="in-row">
              <h3>Self-Managed Identities: </h3>
              <p>
                Empowers businesses to control their identities and data, supporting secure, decentralised
                collaboration.
              </p>
            </div>
          </div>

          <i>
            Veritable&#39;s core principles ensure secure, user-friendly supply chain collaboration. With
            privacy-preserving data sharing, robust security, and transparent verifiability, Veritable protects
            sensitive information while guaranteeing authenticity and trust among all participants.
          </i>
        </div>
      </Page>
    )
  }
}
