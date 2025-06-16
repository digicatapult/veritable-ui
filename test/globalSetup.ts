import 'reflect-metadata'
import {
  bringUpAliceDependenciesContainers,
  bringUpAlicePlaywrightContainer,
  bringUpBobContainers,
  bringUpCharlieContainers,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup'

async function globalSetup() {
  await bringUpSharedContainers()
  await bringUpAliceDependenciesContainers()
  await bringUpAlicePlaywrightContainer()
  await bringUpBobContainers()
  await bringUpCharlieContainers()
}

export default globalSetup
