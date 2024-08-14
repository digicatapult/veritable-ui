import Html from '@kitajs/html'
import { UUID } from 'crypto'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../../common.js'

export type Scope3FormStage = 'form' | 'success' | 'error'
interface Scope3FormProps {
  formStage: Scope3FormStage
  company: ConnectionRow
  queryId?: string | UUID
  productId?: string
  quantity?: number
  emissions?: string
}

@singleton()
export default class Scope3CarbonConsumptionResponseTemplates {
  constructor() {}

  public newScope3CarbonConsumptionResponseFormPage = (
    formStage: Scope3FormStage,
    company: ConnectionRow,
    queryId?: string | UUID,
    quantity?: number,
    productId?: string
  ) => {
    return (
      <Page
        title="Veritable - Select Company"
        activePage="categories"
        heading="Select Company To Send Your Query To"
        headerLinks={[{ name: 'Select Company', url: '/queries/scope-3-carbon-consumption-response' }]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.scope3
            formStage={formStage}
            company={company}
            productId={productId}
            quantity={quantity}
            queryId={queryId}
          />
        </div>
      </Page>
    )
  }
  public scope3 = (props: Scope3FormProps): JSX.Element => {
    switch (props.formStage) {
      case 'form':
        return <this.scope3CarbonConsumptionResponseFormPage {...props}></this.scope3CarbonConsumptionResponseFormPage>
      case 'success':
        return <this.newQuerySuccess {...props}></this.newQuerySuccess>
      case 'error':
        return <this.newQueryError {...props}></this.newQueryError>
    }
  }

  public scope3CarbonConsumptionResponseFormPage = (props: Scope3FormProps) => {
    return (
      <div>
        <div class="container-scope3-carbon">
          <div class="box1">
            <h1>Scope 3 Carbon Consumption</h1>
            <p class="query-text-carbon3-consumption">
              Provide the total scope 3 carbon consumption for the specified products / component. If you do not have
              all the required information, please forward this query to your suppliers, to aggregate their responses
              before submitting the final total.{' '}
            </p>
          </div>
          <div class="box2">
            <p>What are the total Scope 3 carbon emissions for the product/component below? </p>
            <form
              id="scope-3-carbon-consumption"
              hx-post={`/scope-3-carbon-consumption/${props.queryId}/response`}
              hx-select="main > *"
              hx-target="main"
              hx-swap="innerHTML"
            >
              <p>Product ID: {Html.escapeHtml(props.productId)}</p>
              <p>Quantity: {Html.escapeHtml(props.quantity)}</p>
              <input type="hidden" name="companyId" value={Html.escapeHtml(props.company.id)} />
              <div class="input-container">
                <label for="total-scope-3-carbon-emissions-input" class="input-label">
                  Total Scope 3 carbon emissions
                </label>

                <input
                  id="total-scope-3-carbon-emissions-input"
                  name="totalScope3CarbonEmissions"
                  placeholder="Value in kg CO2e (to be aggregated)"
                  class="query-input-field"
                  type="text"
                  required
                  value={props.emissions}
                ></input>
              </div>
              <div class="input-container">
                <label for="partial-response-input">Partial response</label>
                <input id="partial-response-input" name="partialResponse" type="checkbox"></input>
              </div>
              <p>
                *If partial response checkbox is ticked, you must share this query with another supplier in your
                network, where your responses will be aggregated.
              </p>
              <FormButton name="action" value="success" text="Submit Query" style="filled" />
            </form>
          </div>
        </div>
      </div>
    )
  }
  private newQuerySuccess = (props: Scope3FormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          Your query Response has been shared with the following company: {Html.escapeHtml(props.company.company_name)}.
        </p>
        <p>Thank you for answering this query, there is no other action required.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
  private newQueryError = (props: Scope3FormProps): JSX.Element => {
    return (
      <div id="new-query-confirmation-text">
        <p>
          There has been an error when responding to the querry by following company:{' '}
          {Html.escapeHtml(props.company.company_name)}.
        </p>
        <p>Please try again or contact the respective company to resolve this issue.</p>
        <LinkButton disabled={false} text="Back to Home" href="/" icon={''} style="filled" />
      </div>
    )
  }
}
