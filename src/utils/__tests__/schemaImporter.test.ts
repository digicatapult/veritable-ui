import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import mockFs from 'mock-fs'
import { SchemaDefinition } from '../../models/credentialSchema.js'
import { loadSchema } from '../schemaImporter.js'

chai.use(chaiAsPromised)
const expect = chai.expect

describe('loadSchema', () => {
  afterEach(() => {
    mockFs.restore()
  })

  it('should load a valid schema from file', async () => {
    const validSchema: SchemaDefinition = {
      name: 'COMPANY_DETAILS',
      version: '1.0.0',
      attrNames: ['companyName', 'registrationNumber'],
    }

    mockFs({
      './schemas/valid.json': JSON.stringify(validSchema),
    })

    const result = await loadSchema('./schemas/valid.json')
    expect(result).to.deep.equal(validSchema)
  })

  it('should throw if the file is missing', async () => {
    mockFs({})

    await expect(loadSchema('./schemas/missing.json')).to.be.rejectedWith(Error)
  })

  it('should throw on invalid JSON', async () => {
    mockFs({
      './schemas/bad.json': '{ invalid JSON ...',
    })

    await expect(loadSchema('./schemas/bad.json')).to.be.rejectedWith(SyntaxError)
  })

  it('should load an object even if it is not a valid SchemaDefinition (no validation)', async () => {
    const badSchema = { invalid: true }

    mockFs({
      './schemas/badSchema.json': JSON.stringify(badSchema),
    })

    const result = await loadSchema('./schemas/badSchema.json')
    expect(result).to.deep.equal(badSchema)
  })
})
