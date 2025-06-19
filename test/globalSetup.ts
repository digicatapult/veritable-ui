import dotenv from 'dotenv'
import 'reflect-metadata'
import {
  bringUpAliceDependenciesContainers,
  bringUpBobDependenciesContainers,
  bringUpCharlieDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  dotenv.config()
  await bringUpSharedContainers()
  await bringUpAliceDependenciesContainers()
  await bringUpBobDependenciesContainers()
  await bringUpCharlieDependenciesContainers()
  await bringUpVeritableUIContainer('alice', 3000, '07964699')
  await bringUpVeritableUIContainer('bob', 3001, '04659351')
  await bringUpVeritableUIContainer('charlie', 3002, '10016023')
}

export default globalSetup
