import dotenv from 'dotenv'
import 'reflect-metadata'
import {
  bringUpAliceDependenciesContainers,
  bringUpAliceUIContainer,
  bringUpBobContainers,
  bringUpCharlieContainers,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  dotenv.config()
  await bringUpSharedContainers()
  await bringUpAliceDependenciesContainers()
  await bringUpAliceUIContainer()
  await bringUpBobContainers()
  await bringUpCharlieContainers()
}

export default globalSetup
