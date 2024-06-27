import { pino } from 'pino'
import sinon from 'sinon'
import { ILogger } from '../../../logger.js'
import QueriesTemplates from '../../../views/queries.js'

export const withQueriesMocks = () => {
  const templateMock = {
    chooseQueryPage: sinon.stub().returns(`<div id="mocked-page">Mocked HTML content</div>`),
  } as QueriesTemplates
  const mockLogger: ILogger = pino({ level: 'silent' })

  return {
    templateMock,
    mockLogger,
  }
}
