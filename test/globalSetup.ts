import dotenv from 'dotenv'
import 'reflect-metadata'
import {
  bringUpAliceDependenciesContainers,
  bringUpAliceUIContainer,
  bringUpBobDependenciesContainers,
  bringUpBobUIContainer,
  bringUpCharlieDependenciesContainers,
  bringUpCharlieUIContainer,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  dotenv.config()
  await bringUpSharedContainers()
  await bringUpAliceDependenciesContainers()
  await bringUpBobDependenciesContainers()
  await bringUpCharlieDependenciesContainers()
  await bringUpAliceUIContainer()
  await bringUpBobUIContainer()
  await bringUpCharlieUIContainer()
}

export default globalSetup
