import 'reflect-metadata'
import { StartedTestContainer, StoppedTestContainer } from 'testcontainers'
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

async function stopContainers(containers: StartedTestContainer[]) {
  await processPromises(await Promise.allSettled(containers.map((container) => container.stop())))
}

async function processPromises(results: PromiseSettledResult<StoppedTestContainer>[]) {
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} container shutdown unsuccessful with error: ${rejected[0]}`)
  }
}

export default globalTeardown
