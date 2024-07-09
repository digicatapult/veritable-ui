import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { COMPANY_NUMBER, pinCodeRegex } from '../../models/strings.js'
import { Page } from '../common.js'
import { NewConnectionTemplates } from './base.js'

@singleton()
export class PinSubmissionTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public renderPinForm = (company_number: COMPANY_NUMBER, pin?: string) => {
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
              { type: 'submit', value: 'submitPinCode', text: 'Continue' },
            ]}
          >
            <div class="accented-container">
              <p>Please enter the verification code from the physical letter</p>
              <input name="companyNumber" value={company_number} type="hidden" />
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

  public renderSuccess = (action: 'submitPinCode', pin: string, companyNumber: COMPANY_NUMBER): JSX.Element => {
    return (
      <this.newConnectionForm
        submitRoute="pin-submission"
        feedback={{ type: 'message', message: action }}
        progressStep={2}
        progressStepCount={2}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="from-invite-invite-input">
          <p safe>
            PIN Code {pin} has been submitted for {companyNumber}, please wait for their verification and keep updated
            by viewing the verification. status.
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
