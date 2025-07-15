import fs from 'fs/promises'
import path from 'path'
import { SchemaConfig, SchemaDefinition } from '../models/credentialSchema'

export async function loadSchemas(dirPath: string): Promise<SchemaConfig> {
  const files = await fs.readdir(dirPath)
  const schemas: SchemaConfig = {}

  for (const file of files) {
    const content = await fs.readFile(path.join(dirPath, file), 'utf-8')
    const parsed = JSON.parse(content) as SchemaDefinition
    schemas[parsed.name] = parsed
  }

  return schemas
}
