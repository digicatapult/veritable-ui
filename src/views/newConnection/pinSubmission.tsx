import Html from '@kitajs/html'
import { singleton } from 'tsyringe'
import { UUID, pinCodeRegex } from '../../models/strings.js'
import { Page } from '../common.js'
import { NewConnectionTemplates } from './base.js'

@singleton()
export class PinSubmissionTemplates extends NewConnectionTemplates {
  constructor() {
    super()
  }

  public renderPinForm = (props: {
    connectionId: UUID
    pin?: string
    continuationFromInvite: boolean
    remainingTries?: string
  }) => {
    const stepCount = props.continuationFromInvite ? 3 : 2
    return (
      <Page
        title="Veritable - New Connection"
        activePage="connections"
        heading="New Connection - PIN Verification"
        headerLinks={[
          { name: 'Connections', url: '/connection' },
          { name: 'Pin Submission', url: `/connection/${props.connectionId}/pin-submission` },
        ]}
        stylesheets={['connection.css']}
      >
        <div class="connections header">
          <span>PIN Code submission</span>
        </div>
        <this.newConnectionForm
          submitRoute={`${props.connectionId}/pin-submission`}
          progressStep={stepCount - 1}
          progressStepCount={stepCount}
          actions={[
            { type: 'link', text: 'Fill In Later', href: '/connection' },
            { type: 'submit', value: 'submitPinCode', text: 'Continue' },
          ]}
        >
          <div class="accented-container">
            <p>Please enter the verification code from the physical letter</p>
            <input name="stepCount" value={stepCount.toString()} type="hidden" />
            <input
              id="new-connection-invite-input-pin"
              name="pin"
              placeholder="Code"
              required
              value={props.pin || ''}
              type="text"
              pattern={pinCodeRegex.source}
              oninput="this.reportValidity()"
              minlength={6}
              maxlength={6}
            />
            <p id="remaining-pint-attempts">{Html.escapeHtml(props.remainingTries)}</p>
            <img class="htmx-indicator" src="/public/images/send.svg" />
          </div>
        </this.newConnectionForm>
      </Page>
    )
  }

  public renderSuccess = (props: { companyName: string; stepCount: number; errorMessage?: string }): JSX.Element => {
    return (
      <this.newConnectionForm
        feedback={{
          type: 'message',
          message: props.errorMessage
            ? props.errorMessage
            : `PIN code has been sucessfully submitted and will need to be verified by the issuer now.`,
        }}
        progressStep={props.stepCount}
        progressStepCount={props.stepCount}
        actions={[{ type: 'link', text: 'Back To Home', href: '/connection' }]}
      >
        <div id="new-connection-invite-input">
          <p>
            {props.errorMessage ? 'You have run out of PIN attempts ' : 'PIN Code has been submitted '} for
            {Html.escapeHtml(props.companyName)} company ID.{' '}
            {props.errorMessage
              ? 'Please contact the company to request a pin resend.'
              : 'Please wait for the verification code to be confirmed by viewing theverification status.'}
          </p>
        </div>
      </this.newConnectionForm>
    )
  }
}
