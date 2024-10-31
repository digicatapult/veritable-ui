import { singleton } from 'tsyringe'
import { SettingsType } from '../../controllers/settings/index.js'
import { FormButton, Page } from '../common.js'

@singleton()
export default class SettingsTemplates {
  constructor() {}
  public settings = (settings: SettingsType) => {
    return (
      <Page
        title="Veritable - Settings"
        heading="Settings"
        activePage="categories"
        headerLinks={[{ name: 'Settings', url: '/settings' }]}
        stylesheets={['settings.css']}
      >
        <div id="settings-container">
          <h1>Settings</h1>
          <h2>
            <i>Account Details</i>
          </h2>
          <this.settingsForm settingsProps={settings} edit={false} />
          <div id="reset-container">
            <h2>Reset (Demo only)</h2>
            <p>
              Reset or delete all current connections. This will remove any pending, active or other connections
              associated with your account.
            </p>
            <button id="reset-btn" disabled={false} hx-delete="/reset" hx-target="this" hx-swap="none" style="filled">
              <img id="reset-image" src="/public/images/reset.svg" alt="Reset" />
              Reset
            </button>
          </div>
        </div>
      </Page>
    )
  }

  public settingsForm = ({ settingsProps, edit }: { settingsProps: SettingsType; edit: boolean }): JSX.Element => {
    return (
      <form id="settings-form" hx-post={`/settings/${edit == true ? '?edit=true' : ''}`} hx-swap="innerHTML">
        <label for="company_name" class="settings-input-label">
          Company Name
        </label>
        <input
          id="company_name"
          class="disabled settings-input"
          name="company_name"
          placeholder=" placeholder DIGITAL CATAPULT"
          required
          value={settingsProps.company_name}
          type="text"
          oninput="this.reportValidity()"
          minlength={1}
        />
        <label for="companies_house_number" class="settings-input-label">
          Companies House Number
        </label>
        <input
          id="companies_house_number"
          class="disabled settings-input"
          name="companies_house_number"
          required
          value={settingsProps.companies_house_number}
          type="text"
          oninput="this.reportValidity()"
          minlength={1}
        />
        <label for="postal_address" class="settings-input-label">
          Postal Address
        </label>
        <input
          id="postal_address"
          class="disabled settings-input"
          name="postal_address"
          required
          value={settingsProps.postal_address}
          type="text"
          oninput="this.reportValidity()"
          minlength={1}
        />
        <label for="from_email" class="settings-input-label">
          From Address
        </label>
        <input
          id="from_email"
          class="disabled settings-input"
          name="from_email"
          required
          value={settingsProps.from_email}
          type="text"
          oninput="this.reportValidity()"
          minlength={1}
        />
        <label for="admin_email" class="settings-input-label">
          Administrator Email
        </label>
        <div class="in-row">
          <input
            id="admin_email"
            class="settings-input extra-padding-right"
            name="admin_email"
            required
            value={settingsProps.admin_email}
            type="email"
            oninput="this.reportValidity()"
            minlength={1}
            readonly={!edit}
          />
          {edit == false ? (
            <input
              type="image"
              src="/public/images/edit.svg"
              class="edit-button"
              name="action"
              value="updateSettings"
            ></input>
          ) : null}
          {edit == true && (
            <div id="save-button" class="save-button-container">
              <FormButton name="action" value="updateSettings" text="Save" style="outlined" />
            </div>
          )}
        </div>
      </form>
    )
  }
}
