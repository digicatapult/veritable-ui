import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const version = packageJson.version || 'unknown'
export default version
