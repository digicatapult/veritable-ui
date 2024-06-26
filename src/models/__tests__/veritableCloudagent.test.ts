import { describe, it } from 'mocha'

import { Env } from '../../env.js'
import {
  createCredentialDefinitionResponse,
  createDidResponse,
  createInviteSuccessResponse,
  createSchemaResponse,
  getConnectionsSuccessResponse,
  invalidResponse,
  mockLogger,
  receiveInviteSuccessResponse,
} from './fixtures/cloudagentFixtures.js'
import { withCloudagentMock } from './helpers/mockCloudagent.js'

import { InternalError } from '../../errors.js'
import VeritableCloudagent from '../veritableCloudagent.js'

describe('veritableCloudagent', () => {
  let expect: Chai.ExpectStatic
  before(async () => {
    expect = (await import('chai')).expect
  })

  describe('createOutOfBandInvite', () => {
    describe('success', function () {
      withCloudagentMock('POST', `/v1/oob/create-invitation`, 200, createInviteSuccessResponse)

      it('should give back out-of-band invite', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        expect(response).deep.equal(createInviteSuccessResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('POST', `/v1/oob/create-invitation`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('POST', `/v1/oob/create-invitation`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createOutOfBandInvite({ companyName: 'Digital Catapult' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('receiveOutOfBandInvite', () => {
    describe('success', function () {
      withCloudagentMock('POST', '/v1/oob/receive-invitation-url', 200, receiveInviteSuccessResponse)

      it('should give back out-of-band invite', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.receiveOutOfBandInvite({
          companyName: 'Digital Catapult',
          invitationUrl: 'http://example.com',
        })
        expect(response).deep.equal(receiveInviteSuccessResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('POST', '/v1/oob/receive-invitation-url', 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.receiveOutOfBandInvite({
            companyName: 'Digital Catapult',
            invitationUrl: 'http://example.com',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('POST', '/v1/oob/receive-invitation-url', 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.receiveOutOfBandInvite({
            companyName: 'Digital Catapult',
            invitationUrl: 'http://example.com',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('getConnections', () => {
    describe('success', function () {
      withCloudagentMock('GET', '/v1/connections', 200, getConnectionsSuccessResponse)

      it('should respond with connections', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.getConnections()
        expect(response).deep.equal(getConnectionsSuccessResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('GET', '/v1/connections', 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getConnections()
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('GET', '/v1/connections', 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getConnections()
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('deleteConnection', () => {
    describe('success', function () {
      withCloudagentMock('DELETE', '/v1/connections/42', 204, '')

      it('should success', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.deleteConnection('42')
        expect(response).deep.equal(undefined)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('GET', '/v1/connections', 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.deleteConnection('42')
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('createDid', () => {
    describe('success', function () {
      withCloudagentMock('POST', `/v1/dids/create`, 200, createDidResponse)

      it('should give back did', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.createDid('key', { keyType: 'ed25519' })
        expect(response).deep.equal(createDidResponse.didDocument)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('POST', `/v1/dids/create`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createDid('key', { keyType: 'ed25519' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('POST', `/v1/dids/create`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createDid('key', { keyType: 'ed25519' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('getCreatedDids', () => {
    describe('success', function () {
      withCloudagentMock('GET', `/v1/dids?createdLocally=true&method=key`, 200, [createDidResponse])

      it('should give back did', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.getCreatedDids({ method: 'key' })
        expect(response).deep.equal([createDidResponse.didDocument])
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('GET', `/v1/dids?createdLocally=true&method=key`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedDids({ method: 'key' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('GET', `/v1/dids?createdLocally=true&method=key`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedDids({ method: 'key' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('createSchema', () => {
    describe('success', function () {
      withCloudagentMock('POST', `/v1/schemas`, 200, createSchemaResponse)

      it('should give back schema', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.createSchema('issuerId', 'name', 'version', [])
        expect(response).deep.equal(createSchemaResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('POST', `/v1/schemas`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createSchema('issuerId', 'name', 'version', [])
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('POST', `/v1/schemas`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createSchema('issuerId', 'name', 'version', [])
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('getCreatedSchemas', () => {
    describe('success', function () {
      withCloudagentMock(
        'GET',
        `/v1/schemas?createdLocally=true&issuerId=issuerId&schemaName=name&schemaVersion=version`,
        200,
        [createSchemaResponse]
      )

      it('should give back schema', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.getCreatedSchemas({
          issuerId: 'issuerId',
          schemaName: 'name',
          schemaVersion: 'version',
        })
        expect(response).deep.equal([createSchemaResponse])
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock(
        'GET',
        `/v1/schemas?createdLocally=true&issuerId=issuerId&schemaName=name&schemaVersion=version`,
        400,
        {}
      )

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedSchemas({ issuerId: 'issuerId', schemaName: 'name', schemaVersion: 'version' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock(
        'GET',
        `/v1/schemas?createdLocally=true&issuerId=issuerId&schemaName=name&schemaVersion=version`,
        200,
        invalidResponse
      )

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedSchemas({ issuerId: 'issuerId', schemaName: 'name', schemaVersion: 'version' })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  //HERE

  describe('createCredentialDefinition', () => {
    describe('success', function () {
      withCloudagentMock('POST', `/v1/credential-definitions`, 200, createCredentialDefinitionResponse)

      it('should give back credential definition', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.createCredentialDefinition('issuerId', 'schemaId', 'tag')
        expect(response).deep.equal(createCredentialDefinitionResponse)
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock('POST', `/v1/schemas`, 400, {})

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createCredentialDefinition('issuerId', 'schemaId', 'tag')
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock('POST', `/v1/schemas`, 200, invalidResponse)

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.createCredentialDefinition('issuerId', 'schemaId', 'tag')
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })

  describe('getCreatedCredentialDefinitions', () => {
    describe('success', function () {
      withCloudagentMock(
        'GET',
        `/v1/credential-definitions?createdLocally=true&issuerId=issuerId&schemaId=schemaId`,
        200,
        [createCredentialDefinitionResponse]
      )

      it('should give back credential definition', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)
        const response = await cloudagent.getCreatedCredentialDefinitions({
          issuerId: 'issuerId',
          schemaId: 'schemaId',
        })
        expect(response).deep.equal([createCredentialDefinitionResponse])
      })
    })

    describe('error (response code)', function () {
      withCloudagentMock(
        'GET',
        `/v1/credential-definitions?createdLocally=true&issuerId=issuerId&schemaId=schemaId`,
        400,
        {}
      )

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedCredentialDefinitions({
            issuerId: 'issuerId',
            schemaId: 'schemaId',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })

    describe('error (response invalid)', function () {
      withCloudagentMock(
        'GET',
        `/v1/credential-definitions?createdLocally=true&issuerId=issuerId&schemaId=schemaId`,
        200,
        invalidResponse
      )

      it('should throw internal error', async () => {
        const environment = new Env()
        const cloudagent = new VeritableCloudagent(environment, mockLogger)

        let error: unknown = null
        try {
          await cloudagent.getCreatedCredentialDefinitions({
            issuerId: 'issuerId',
            schemaId: 'schemaId',
          })
        } catch (err) {
          error = err
        }
        expect(error).instanceOf(InternalError)
      })
    })
  })
})
