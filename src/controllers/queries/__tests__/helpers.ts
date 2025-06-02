import { Readable } from 'node:stream'
import sinon from 'sinon'

import Database from '../../../models/db/index.js'
import { ConnectionRow, QueryRow } from '../../../models/db/types.js'
import { UUID } from '../../../models/strings.js'
import VeritableCloudagent from '../../../models/veritableCloudagent/index.js'
import QueriesTemplates from '../../../views/queries/queries.js'
import QueryListTemplates from '../../../views/queries/queriesList.js'
import CarbonEmbodimentTemplates from '../../../views/queries/requestCo2embodiment.js'
import CarbonEmbodimentResponseTemplates, { CarbonEmbodimentFormProps } from '../../../views/queries/responseCo2embodiment.js'

type QueryStatus = 'resolved' | 'pending_your_input' | 'pending_their_input' | 'forwarded'

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
    queryInsert: Partial<QueryRow>[]
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
        id: '5390af91-c551-4d74-b394-d8ae0805059a',
        status: 'pending_their_input',
        type: 'total_carbon_embodiment',
        connection_id: mockIds.companyId,
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              productId: mockIds.queryId,
              quantity: 2,
            },
          },
        },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
        expires_at: new Date(1000),
        created_at: new Date(1000),
      },
      {
        id: '5390af91-c551-4d74-b394-d8ae0805059a',
        status: 'pending_your_input',
        type: 'total_carbon_embodiment',
        connection_id: mockIds.connectionId,
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              productId: mockIds.queryId,
              quantity: 2,
            },
          },
        },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
        expires_at: new Date(1000),
        created_at: new Date(1000),
      },
      {
        status: 'pending_your_input',
        type: 'total_carbon_embodiment',
        connection_id: mockIds.connectionId,
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              productId: mockIds.queryId,
              quantity: 2,
            },
          },
        },
        response_id: '5390af91-c551-4d74-b394-d8ae0805059e',
        expires_at: new Date(1000),
        created_at: new Date(1000),
      },
    ],
    queryInsert: [
      {
        id: 'ccaaaaaa-0000-0000-0000-d8ae0805059e',
        connection_id: mockIds.connectionId,
        type: 'total_carbon_embodiment',
        status: 'pending_their_input',
        details: {
          subjectId: {
            idType: 'product_and_quantity',
            content: {
              productId: 'test-1',
              quantity: 10,
            },
          },
        },
        response_id: null,
        response: null,
        role: 'requester',
        expires_at: new Date(1000),
        created_at: new Date(1000),
      },
    ],
  },
}

function templateFake(templateName: string, props?: CarbonEmbodimentFormProps) {
  if (props?.partial) return Promise.resolve(`${templateName}_template-${JSON.stringify(props)}`)
  if (props?.formStage) return Promise.resolve(`${templateName}_${props.formStage}_template`)
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

  const CarbonEmbodimentTemplateMock = {
    newCarbonEmbodimentFormPage: (props: { formStage: string }) =>
      templateListFake('carbonEmbodiment', props.formStage),
  } as unknown as CarbonEmbodimentTemplates

  const CarbonEmbodimentResponseTemplateMock = {
    newCarbonEmbodimentResponseFormPage: (props: CarbonEmbodimentFormProps) => templateFake('queriesResponse', props),
    view: () => templateListFake('carbonEmbodimentResponse'),
  } as unknown as CarbonEmbodimentResponseTemplates
  const queryTemplateMock = {
    chooseQueryPage: () => templateFake('queries'),
  } as QueriesTemplates
  const cloudagentMock = {
    submitDrpcRequest: sinon.stub().resolves({
      result: {
        type: 'https://github.com/digicatapult/veritable-documentation/tree/main/schemas/veritable_messaging/query_ack/0.1',
      },
      id: 'request-id',
    }),
  }
  const queryListTemplateMock = {
    listPage: (queries: Query[]) => templateListFake('list', queries[0].company_name, queries[0].status),
  } as unknown as QueryListTemplates
  const dbMock = {
    get: sinon.stub().callsFake((tableName: 'connection' | 'query') => Promise.resolve(options.getRows[tableName])),
    update: sinon.stub().resolves(),
    insert: sinon.stub().callsFake((tableName: 'query' | 'query_rpc') => {
      if (tableName === 'query') return Promise.resolve(options.getRows['queryInsert'])
      Promise.resolve()
    }),
  }

  return {
    CarbonEmbodimentTemplateMock,
    CarbonEmbodimentResponseTemplateMock,
    queryListTemplateMock,
    queryTemplateMock,
    dbMock,
    cloudagentMock,
    args: [
      CarbonEmbodimentTemplateMock,
      CarbonEmbodimentResponseTemplateMock,
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
