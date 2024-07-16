import Html from '@kitajs/html'
import { CompanyProfile } from '../../models/companyHouseEntity.js'
import { FormButton, LinkButton } from '../common.js'

export type FormFeedback =
  | {
      type: 'companyFound'
      company: CompanyProfile
    }
  | {
      type: 'message'
      message: string
    }
  | {
      type: 'error'
      error: string
    }

export type FormAction =
  | {
      type: 'submit'
      value: string
      text: string
    }
  | {
      type: 'link'
      text: string
      href: string
    }

export abstract class NewConnectionTemplates {
  protected newConnectionForm = (
    props: Html.PropsWithChildren<{
      submitRoute?: string
      feedback?: FormFeedback
      progressStep: number
      progressStepCount: number
      actions: FormAction[]
    }>
  ): JSX.Element => {
    const htmxProps = props.submitRoute
      ? {
          'hx-post': `/connection/${props.submitRoute}`,
          'hx-swap': 'outerHTML',
          'hx-select': '#new-connection-form',
        }
      : {}

    return (
      <form id="new-connection-form" {...htmxProps}>
        <this.stepper stage={props.progressStep} total={props.progressStepCount} />
        {props.children}
        {props.feedback && <this.feedback feedback={props.feedback} />}
        <div id="new-connection-actions">
          {props.actions.map((action, i) => {
            const lastIndex = props.actions.length - 1
            const style = i === lastIndex ? 'filled' : 'outlined'
            switch (action.type) {
              case 'link':
                return <LinkButton text={action.text} href={action.href} style={style} />
              case 'submit':
                return <FormButton name="action" value={action.value} text={action.text} style={style} />
            }
          })}
        </div>
      </form>
    )
  }

  protected feedback = (props: { feedback: FormFeedback }): JSX.Element => {
    switch (props.feedback.type) {
      case 'message':
        return <this.feedbackMessage message={props.feedback.message} />
      case 'companyFound':
        return <this.feedbackCompanyInfo company={props.feedback.company} />
      case 'error':
        return <this.feedbackMessage message={props.feedback.error} isError={true} />
    }
  }

  protected feedbackCompanyInfo = ({ company }: { company: CompanyProfile }): JSX.Element => {
    const addressLines = [
      company.company_name,
      company.registered_office_address.address_line_1,
      company.registered_office_address.address_line_2,
      company.registered_office_address.address_line_2,
      company.registered_office_address.care_of,
      company.registered_office_address.locality,
      company.registered_office_address.po_box,
      company.registered_office_address.postal_code,
      company.registered_office_address.country,
      company.registered_office_address.premises,
      company.registered_office_address.region,
    ].filter((x) => !!x)

    return (
      <div id="new-connection-feedback" class="accented-container feedback-positive">
        <div>
          <p>
            <span>Registered Office Address</span>
            {addressLines.map((line, i) => (
              <span class="address-line">
                {Html.escapeHtml(line) + (i === addressLines.length - 1 ? '' : ',&nbsp')}
              </span>
            ))}
          </p>

          <p>
            <span>Company Status</span>
            {Html.escapeHtml(company.company_status)}
          </p>
        </div>
        <div>
          <img src="/public/images/check.svg" alt="Description of the image" />
        </div>
      </div>
    )
  }

  protected feedbackMessage = ({ message, isError = false }: { message: string; isError?: boolean }): JSX.Element => {
    const messageClass = isError ? 'feedback-negative' : 'feedback-neutral'
    return (
      <div id="new-connection-feedback" class={`accented-container ${messageClass}`}>
        {Html.escapeHtml(message)}
      </div>
    )
  }

  protected stepper = (params: { stage: number; total: number }): JSX.Element => {
    return (
      <div id="new-connection-progress" style={`--progress-percent: ${params.stage / params.total}`}>
        <div id="new-connection-progress-text">
          <span>Step {params.stage}</span>
          <span> of {params.total}</span>
        </div>
        <div id="new-connection-progress-bar"></div>
      </div>
    )
  }
}
