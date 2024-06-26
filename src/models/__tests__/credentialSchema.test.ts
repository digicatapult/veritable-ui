import { expect } from 'chai'
import { describe, test } from 'mocha'

import { CredentialSchema } from '../credentialSchema.js'
import { makeCredentialSchemaMocks } from './helpers/credentialSchemaMocks.js'

describe('credentialSchema', function () {
  describe('assertIssuanceRecords', function () {
    describe('did assertions', function () {
      test('policy = CREATE_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'CREATE_NEW', hasDids: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedDids.callCount).to.equal(0)
        expect(createDid.callCount).to.equal(1)
        expect(createDid.firstCall.args).deep.equal(['key', { keyType: 'ed25519' }])
      })

      test('policy = CREATE_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'CREATE_NEW', hasDids: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedDids.callCount).to.equal(0)
        expect(createDid.callCount).to.equal(1)
        expect(createDid.firstCall.args).deep.equal(['key', { keyType: 'ed25519' }])
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'FIND_EXISTING', hasDids: false })
        const credentialSchema = new CredentialSchema(...args)

        let error: unknown | null = null
        try {
          await credentialSchema.assertIssuanceRecords()
        } catch (err) {
          error = err
        }

        expect(error).instanceOf(Error)
        expect(getCreatedDids.callCount).to.equal(1)
        expect(getCreatedDids.firstCall.args).deep.equal([{ method: 'key' }])
        expect(createDid.callCount).to.equal(0)
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'FIND_EXISTING', hasDids: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedDids.callCount).to.equal(1)
        expect(getCreatedDids.firstCall.args).deep.equal([{ method: 'key' }])
        expect(createDid.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'EXISTING_OR_NEW', hasDids: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedDids.callCount).to.equal(1)
        expect(getCreatedDids.firstCall.args).deep.equal([{ method: 'key' }])
        expect(createDid.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createDid, getCreatedDids },
        } = makeCredentialSchemaMocks({ didPolicy: 'EXISTING_OR_NEW', hasDids: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedDids.callCount).to.equal(1)
        expect(getCreatedDids.firstCall.args).deep.equal([{ method: 'key' }])
        expect(createDid.callCount).to.equal(1)
        expect(createDid.firstCall.args).deep.equal(['key', { keyType: 'ed25519' }])
      })
    })

    describe('schema assertions', function () {
      test('policy = CREATE_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'CREATE_NEW', hasSchema: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedSchemas.callCount).to.equal(0)
        expect(createSchema.callCount).to.equal(1)
        expect(createSchema.firstCall.args).deep.equal([
          'did-id',
          'COMPANY_DETAILS',
          '1.0.0',
          ['company_number', 'company_name'],
        ])
      })

      test('policy = CREATE_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'CREATE_NEW', hasSchema: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedSchemas.callCount).to.equal(0)
        expect(createSchema.callCount).to.equal(1)
        expect(createSchema.firstCall.args).deep.equal([
          'did-id',
          'COMPANY_DETAILS',
          '1.0.0',
          ['company_number', 'company_name'],
        ])
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'FIND_EXISTING', hasSchema: false })
        const credentialSchema = new CredentialSchema(...args)

        let error: unknown | null = null
        try {
          await credentialSchema.assertIssuanceRecords()
        } catch (err) {
          error = err
        }

        expect(error).instanceOf(Error)
        expect(getCreatedSchemas.callCount).to.equal(1)
        expect(getCreatedSchemas.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaName: 'COMPANY_DETAILS',
            schemaVersion: '1.0.0',
          },
        ])
        expect(createSchema.callCount).to.equal(0)
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'FIND_EXISTING', hasSchema: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedSchemas.callCount).to.equal(1)
        expect(getCreatedSchemas.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaName: 'COMPANY_DETAILS',
            schemaVersion: '1.0.0',
          },
        ])
        expect(createSchema.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'EXISTING_OR_NEW', hasSchema: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedSchemas.callCount).to.equal(1)
        expect(getCreatedSchemas.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaName: 'COMPANY_DETAILS',
            schemaVersion: '1.0.0',
          },
        ])
        expect(createSchema.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createSchema, getCreatedSchemas },
        } = makeCredentialSchemaMocks({ schemaPolicy: 'EXISTING_OR_NEW', hasSchema: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedSchemas.callCount).to.equal(1)
        expect(getCreatedSchemas.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaName: 'COMPANY_DETAILS',
            schemaVersion: '1.0.0',
          },
        ])
        expect(createSchema.callCount).to.equal(1)
        expect(createSchema.firstCall.args).deep.equal([
          'did-id',
          'COMPANY_DETAILS',
          '1.0.0',
          ['company_number', 'company_name'],
        ])
      })
    })

    describe('credential definition assertions', function () {
      test('policy = CREATE_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'CREATE_NEW', hasCredDef: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedCredentialDefinitions.callCount).to.equal(0)
        expect(createCredentialDefinition.callCount).to.equal(1)
        expect(createCredentialDefinition.firstCall.args).deep.equal(['did-id', 'id', 'company_details_v1.0.0'])
      })

      test('policy = CREATE_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'CREATE_NEW', hasCredDef: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedCredentialDefinitions.callCount).to.equal(0)
        expect(createCredentialDefinition.callCount).to.equal(1)
        expect(createCredentialDefinition.firstCall.args).deep.equal(['did-id', 'id', 'company_details_v1.0.0'])
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'FIND_EXISTING', hasCredDef: false })
        const credentialSchema = new CredentialSchema(...args)

        let error: unknown | null = null
        try {
          await credentialSchema.assertIssuanceRecords()
        } catch (err) {
          error = err
        }

        expect(error).instanceOf(Error)
        expect(getCreatedCredentialDefinitions.callCount).to.equal(1)
        expect(getCreatedCredentialDefinitions.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaId: 'id',
          },
        ])
        expect(createCredentialDefinition.callCount).to.equal(0)
      })

      test('policy = FIND_EXISTING, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'FIND_EXISTING', hasCredDef: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedCredentialDefinitions.callCount).to.equal(1)
        expect(getCreatedCredentialDefinitions.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaId: 'id',
          },
        ])
        expect(createCredentialDefinition.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = true', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'EXISTING_OR_NEW', hasCredDef: true })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedCredentialDefinitions.callCount).to.equal(1)
        expect(getCreatedCredentialDefinitions.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaId: 'id',
          },
        ])
        expect(createCredentialDefinition.callCount).to.equal(0)
      })

      test('policy = EXISTING_OR_NEW, has existing = false', async function () {
        const {
          args,
          mockCloudagent: { createCredentialDefinition, getCreatedCredentialDefinitions },
        } = makeCredentialSchemaMocks({ credDefPolicy: 'EXISTING_OR_NEW', hasCredDef: false })
        const credentialSchema = new CredentialSchema(...args)

        const result = await credentialSchema.assertIssuanceRecords()

        expect(result).to.deep.equal({
          credentialDefinitionId: {
            COMPANY_DETAILS: 'id',
          },
          issuerId: 'did-id',
          schemaId: {
            COMPANY_DETAILS: 'id',
          },
        })
        expect(getCreatedCredentialDefinitions.callCount).to.equal(1)
        expect(getCreatedCredentialDefinitions.firstCall.args).deep.equal([
          {
            issuerId: 'did-id',
            schemaId: 'id',
          },
        ])
        expect(createCredentialDefinition.callCount).to.equal(1)
        expect(createCredentialDefinition.firstCall.args).deep.equal(['did-id', 'id', 'company_details_v1.0.0'])
      })
    })
  })
})
