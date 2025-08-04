import 'reflect-metadata'
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
  // Pass in ('name', host port for UI, 'company number', default company registry)
  await bringUpVeritableUIContainer('alice', 3000, '07964699')
  await bringUpVeritableUIContainer('bob', 3001, '04659351')
  await bringUpVeritableUIContainer('charlie', 3002, '3211809', 'US')
}

export default globalSetup
