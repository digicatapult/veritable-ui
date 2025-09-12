import 'reflect-metadata'
import {
  aliceDepsContainers,
  aliceUIContainer,
  bobDepsContainers,
  bobUIContainer,
  charlieDepsContainers,
  charlieUIContainer,
  daveDepsContainers,
  daveUIContainer,
  sharedContainers,
} from './globalSetup'
import { stopContainers } from './helpers/container'
import { network } from './testcontainers/testcontainersSetup'

async function globalTeardown() {
  await stopContainers(aliceDepsContainers)
  await stopContainers(bobDepsContainers)
  await stopContainers(charlieDepsContainers)
  await stopContainers(daveDepsContainers)
  await stopContainers(aliceUIContainer)
  await stopContainers(bobUIContainer)
  await stopContainers(charlieUIContainer)
  await stopContainers(daveUIContainer)
  await stopContainers(sharedContainers)

  await network.stop()
}

export default globalTeardown
