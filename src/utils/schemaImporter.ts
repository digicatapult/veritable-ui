import fs from 'fs/promises'
import { SchemaDefinition } from '../models/credentialSchema'

export async function loadSchema(pathToFile: string): Promise<SchemaDefinition> {
    const file = await fs.readFile(pathToFile, 'utf-8')
    const parsed = JSON.parse(file) as SchemaDefinition
  return parsed
}
