import Html from '@kitajs/html'
import { UUID } from 'crypto'
import { singleton } from 'tsyringe'
import { ConnectionRow } from '../../../models/db/types.js'
import { FormButton, LinkButton, Page } from '../../common.js'

export type Scope3FormStage = 'form' | 'success' | 'error'
interface Scope3FormProps {
  formStage: Scope3FormStage
  company: ConnectionRow
  connections?: ConnectionRow[]
  partial?: boolean
  queryId?: string | UUID
  productId?: string
  quantity?: number
  emissions?: string
}

@singleton()
export default class Scope3CarbonConsumptionResponseTemplates {
  constructor() {}

  public newScope3CarbonConsumptionResponseFormPage = ({
    formStage,
    company,
    queryId,
    quantity,
    productId,
    partial,
    connections,
  }: Scope3FormProps) => {
    return (
      <Page
        title="Veritable - Select Company"
        activePage="queries"
        heading="Select Company To Send Your Query To"
        headerLinks={[
          { name: 'Query Management', url: '/queries' },
          {
            name: `Query Request ${productId}`,
            url: `/queries/scope-3-carbon-consumption/${queryId}/response`,
          },
        ]}
      >
        <div class="connections header"></div>
        <div class="card-body">
          <this.scope3
            formStage={formStage}
            company={company}
            productId={productId}
            quantity={quantity || 0}
            queryId={queryId}
            partial={partial}
            connections={connections}
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

  public scope3CarbonConsumptionResponseFormPage = ({
    partial = false,
    connections = [],
    ...props
  }: Scope3FormProps) => {
    return (
      <div class="container-scope3-carbon">
        <div class="scope3-co2-left">
          <h1 id="scope3-co2-heading">Scope 3 Carbon Consumption</h1>
          <p style={{ paddingRight: '50px' }} class="query-text-carbon3-consumption">
            Provide the total scope 3 carbon consumption for the specified products / component.
          </p>
          <p class="query-text-carbon3-consumption">
            If you do not have all the required information, please forward this query to your suppliers, to aggregate
            their responses before submitting the final total.{' '}
          </p>
        </div>
        <div class="scope3-co2-right">
          <p class="query-text-carbon3-consumption">
            What are the total Scope 3 carbon emissions for the product/component below?
          </p>
          <div hx-swap-oob="true" hx-swap="ignoreTitle:true" id="partial-query">
            <form
              id="scope-3-carbon-consumption"
              hx-post={`/queries/scope-3-carbon-consumption/${props.queryId}/response`}
              hx-select="main > *"
              hx-target="main"
              hx-swap="innerHTML"
            >
              <p>
                Product ID: {props.productId}
                <br />
                Quantity: {props.quantity}
              </p>
              <input type="hidden" name="companyId" value={Html.escapeHtml(props.company.id)} />
              <div class="input-container">
                <label for="co2-emissions-input" class="input-label">
                  Total Scope 3 carbon emissions
                </label>
                <input
                  id="co2-emissions-input"
                  name="totalScope3CarbonEmissions"
                  placeholder="Value in kg CO2e (to be aggregated)"
                  class={`input-with-label ${partial ? 'disabled' : ''}`}
                  type="text"
                  value={props.emissions}
                  disabled={partial}
                  required={!partial}
                />
              </div>
              <div class="input-container">
                <input
                  hx-trigger="changed, click"
                  hx-target="#partial-query"
                  hx-get={`/queries/${props.queryId}/partial/${props.company.id}`}
                  id="partial-response-input"
                  name="partialQuery"
                  type="checkbox"
                  checked={partial}
                />
                <label for="partial-response-input">Partial response</label>
              </div>
              <p style={{ fontStyle: 'italic', fontSize: '14px;' }}>
                *If partial response checkbox is ticked, you must share this query with another supplier in your
                network, where your responses will be aggregated.
              </p>
              {partial && connections && (
                <div class="query-partial-container list-page">
                  <table>
                    <thead>
                      {['Select', 'Company Name', 'Product ID', 'Quantity'].map((name: string) => (
                        <th>{name}</th>
                      ))}
                    </thead>
                    <tbody hx-swap-oob="true">
                      {connections.length == 0 ? (
                        <tr>
                          <td>No Connections found</td>
                        </tr>
                      ) : (
                        connections.map(({ company_name, id }) => (
                          <tr
                          /* some nwe TODOs for the UI
                            [ ] - ability to check/select table rows
                            [ ] - table row should be disabled after select
                            [ ] - checkbox background-color
                            [ ] - form should require at least one item selected (checked)
                            [ ] - test scenarios
                            [ ] - updates everywhere else to address recent changes
                          hx-trigger='changed, from:${id}'
                          hx-get='get row and parse checkbox parameter on/off'
                          hx-swap='outerHTML'
                        */
                          >
                            <td>
                              <input name={id} type="checkbox" />
                            </td>
                            <td>{company_name}</td>
                            <td>
                              <input
                                name={`product-id-${id}`}
                                placeholder="Product ID"
                                class="input-basic"
                                type="text"
                                value={props.productId}
                              />
                            </td>
                            <td>
                              <input name={`quantity-${id}`} placeholder="Quantity" class="input-basic" type="number" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <br />
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
