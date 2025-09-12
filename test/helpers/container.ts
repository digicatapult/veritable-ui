import { StartedTestContainer, StoppedTestContainer } from 'testcontainers'

export async function stopContainers(containers: StartedTestContainer[]) {
  await processPromises(await Promise.allSettled(containers.map((container) => container.stop())))
}

export async function processPromises(results: PromiseSettledResult<StoppedTestContainer>[]) {
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason)

  if (rejected.length > 0) {
    throw new Error(`${rejected.length} container shutdown unsuccessful with error: ${rejected[0]}`)
  }
}
