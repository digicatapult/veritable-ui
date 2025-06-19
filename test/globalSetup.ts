import dotenv from 'dotenv'
import 'reflect-metadata'
import {
  bringUpDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  dotenv.config()
  await bringUpSharedContainers()
  await bringUpDependenciesContainers('alice', 5432, 3100)
  await bringUpDependenciesContainers('bob', 5433, 3101)
  await bringUpDependenciesContainers('charlie', 5434, 3102)
  await bringUpVeritableUIContainer('alice', 3000, '07964699')
  await bringUpVeritableUIContainer('bob', 3001, '04659351')
  await bringUpVeritableUIContainer('charlie', 3002, '10016023')
}

export default globalSetup
