import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { BASE_64_URL, pinCodeRegex } from '../../models/strings.js'
import { Page } from '../common.js'
import { NewConnectionTemplates } from './base.js'

@singleton()
export class PinSubmissionTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public renderPage = (invite: BASE_64_URL, pin?: string) => {
    return (
      <Page
        title="Veritable - New Connection"
        activePage="connections"
        heading="New Connection - PIN Verification"
        headerLinks={[
          { name: 'Connections', url: '/connection' },
          { name: 'Pin Submission', url: `/connection/new/pin-submission` },
        ]}
        stylesheets={['new-invite.css']}
      >
        <div class="connections header">
          <span>PIN Code submission</span>
        </div>
        <div class="card-body">
          <this.newConnectionForm
            feedback={undefined}
            submitRoute="pin-submission"
            progressStep={1}
            progressStepCount={2}
            actions={[
              { type: 'link', text: 'Fill In Later', href: '/connection' },
              { type: 'submit', value: 'submit', text: 'Continue' },
            ]}
          >
            <div class="accented-container">
              <p>Please enter the verification code from the physical letter</p>
              <input name="invite" value={invite} type="hidden" />
              <input
                id="from-invite-invite-input-pin"
                name="pin"
                class="new-connection-input-field"
                placeholder="Code"
                required
                value={pin || ''}
                type="text"
                pattern={pinCodeRegex.source}
                minlength={6}
                maxlength={6}
              />
            </div>
          </this.newConnectionForm>
        </div>
      </Page>
    )
  }

  public renderSuccess = (invite: BASE_64_URL, pin?: string): JSX.Element => {
    console.log({ invite, pin })
    return (
      <this.newConnectionForm
        submitRoute="pin-submission"
        feedback={undefined}
        progressStep={2}
        progressStepCount={2}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="from-invite-invite-input">
          <p>
            PIN Code has been submitted, please wait for their verification and keep updated by viewing the verification
            status.
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
