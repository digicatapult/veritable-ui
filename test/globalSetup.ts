import 'reflect-metadata'
import { RegistryType } from '../src/models/db/types'
import { CountryCode } from '../src/models/stringTypes'
import {
  bringUpDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  await bringUpSharedContainers()
  // Pass in ('name', host port for UI database, host port for cloudagent)
  await bringUpDependenciesContainers('alice', 5432, 3100)
  await bringUpDependenciesContainers('bob', 5433, 3101)
  await bringUpDependenciesContainers('charlie', 5434, 3102)
  await bringUpDependenciesContainers('dave', 5435, 3103)
  // Pass in ('name', host port for UI, 'company number', default company registry)
  await bringUpVeritableUIContainer('alice', 3000, '07964699')
  await bringUpVeritableUIContainer('bob', 3001, '04659351')
  await bringUpVeritableUIContainer('charlie', 3002, '3211809', 'US' as CountryCode, 'ny_state' as RegistryType)
  await bringUpVeritableUIContainer('dave', 3003, '00102498', 'GB' as CountryCode, 'open_corporates' as RegistryType)
}

export default globalSetup
