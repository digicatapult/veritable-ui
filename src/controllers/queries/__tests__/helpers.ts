import { Readable } from 'node:stream'
import sinon from 'sinon'

import Database from '../../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import { UUID } from '../../../models/strings.js'
import VeritableCloudagent from '../../../models/veritableCloudagent.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'
import Scope3CarbonConsumptionTemplates from '../../../views/queries/requestCo2scope3.js'
import Scope3CarbonConsumptionResponseTemplates, { Scope3FormProps } from '../../../views/queries/responseCo2scope3.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input'

interface Query {
  company_name: string
  query_type: string
  updated_at: Date
  status: QueryStatus
}

type QueryMockOptions = {
  getRows: {
    connection: Partial<ConnectionRow>[]
    query: Partial<QueryRow>[]
  }
}

const mockIds: { [k: string]: UUID } = {
  queryId: '00000000-0000-0000-0000-d8ae0805059e',
  companyId: 'cccccccc-0001-0000-0000-d8ae0805059e',
  connectionId: 'cccccccc-0000-0000-0000-d8ae0805059e',
  agentConnectionId: 'aaaaaaaa-0000-0000-0000-d8ae0805059e',
}

const defaultOptions: QueryMockOptions = {
  getRows: {
    connection: [
      {
        company_name: 'VER123',
        status: 'verified_both',
        id: mockIds.companyId,
        agent_connection_id: mockIds.agentConnectionId,
      },
      {
        company_name: 'PARTIAL_QUERY',
        status: 'verified_both',
        id: mockIds.connectionId,
        agent_connection_id: mockIds.agentConnectionId,
      },
      {
        company_name: 'VERIFIED_THEM',
        status: 'verified_them',
        id: mockIds.connectionId,
        agent_connection_id: mockIds.agentConnectionId,
      },
    ],
    query: [
      {
        status: 'pending_their_input',
        connection_id: mockIds.companyId,
        details: { quantity: 2, queryId: mockIds.queryId },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
      },
      {
        status: 'pending_your_input',
        connection_id: mockIds.connectionId,
        details: { quantity: 2, queryId: mockIds.queryId },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
      },
      {
        status: 'pending_your_input',
        connection_id: mockIds.connectionId,
        details: { quantity: 2, queryId: mockIds.queryId },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
      },
    ],
  },
}

function templateFake(templateName: string, props?: Scope3FormProps) {
  if (props?.partial) return Promise.resolve(`${templateName}_template-${JSON.stringify(props)}`)
  return Promise.resolve(`${templateName}_template`)
}
function templateListFake(templateName: string, ...args: unknown[]) {
  return Promise.resolve([templateName, args.join('-'), templateName].join('_'))
}
export const withQueriesMocks = (testOptions: Partial<QueryMockOptions> = {}) => {
  const options = {
    ...defaultOptions,
    ...testOptions,
  }

  const scope3CarbonConsumptionTemplateMock = {
    newScope3CarbonConsumptionFormPage: (props: { formStage: string }) => templateListFake('scope3', props.formStage),
  } as unknown as Scope3CarbonConsumptionTemplates

  const scope3CarbonConsumptionResponseTemplateMock = {
    newScope3CarbonConsumptionResponseFormPage: (props: Scope3FormProps) => templateFake('queriesResponse', props),
    view: () => templateListFake('scope3Response'),
  } as unknown as Scope3CarbonConsumptionResponseTemplates
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const cloudagentMock = {
    submitDrpcRequest: sinon.stub().resolves({
      result: 'result',
      id: 'request-id',
    }),
  }
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as unknown as QueryListTemplates
  const dbMock = {
    get: sinon.stub().callsFake((tableName: 'connection' | 'query') => Promise.resolve(options.getRows[tableName])),
    update: sinon.stub().resolves(),
    insert: sinon.stub().resolves([
      {
        status: 'pending_their_input',
        id: 123,
        created_at: new Date(),
        updated_at: new Date(),
        connection_id: 'aa000000-0000-0000-0000-aabbccddee00',
        query_type: 'Scope 3',
        details: 'some details',
      },
    ]),
  }

  return {
    scope3CarbonConsumptionTemplateMock,
    scope3CarbonConsumptionResponseTemplateMock,
    queryListTemplateMock,
    queryTemplateMock,
    dbMock,
    cloudagentMock,
    args: [
      scope3CarbonConsumptionTemplateMock,
      scope3CarbonConsumptionResponseTemplateMock,
      queryTemplateMock,
      queryListTemplateMock,
      cloudagentMock as unknown as VeritableCloudagent,
      dbMock as unknown as Database,
    ] as const,
  }
}

export const toHTMLString = async (stream: Readable) => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export { mockIds }
