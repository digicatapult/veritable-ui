import 'reflect-metadata'
import { StartedTestContainer } from 'testcontainers'
import { RegistryType } from '../src/models/db/types'
import { CountryCode } from '../src/models/stringTypes'
import {
  bringUpDependenciesContainers,
  bringUpSharedContainers,
  bringUpVeritableUIContainer,
} from './testcontainers/testcontainersSetup'

export let sharedContainers: StartedTestContainer[]
export let aliceDepsContainers: StartedTestContainer[]
export let bobDepsContainers: StartedTestContainer[]
export let charlieDepsContainers: StartedTestContainer[]
export let daveDepsContainers: StartedTestContainer[]
export let aliceUIContainer: StartedTestContainer[]
export let bobUIContainer: StartedTestContainer[]
export let charlieUIContainer: StartedTestContainer[]
export let daveUIContainer: StartedTestContainer[]

async function globalSetup() {
  sharedContainers = await bringUpSharedContainers()
  // Pass in ('name', host port for UI database, host port for cloudagent)
  aliceDepsContainers = await bringUpDependenciesContainers('alice', 5432, 3100)
  bobDepsContainers = await bringUpDependenciesContainers('bob', 5433, 3101)
  charlieDepsContainers = await bringUpDependenciesContainers('charlie', 5434, 3102)
  daveDepsContainers = await bringUpDependenciesContainers('dave', 5435, 3103)
  // Pass in ('name', host port for UI, 'company number', default company registry)
  aliceUIContainer = await bringUpVeritableUIContainer('alice', 3000, '07964699')
  bobUIContainer = await bringUpVeritableUIContainer('bob', 3001, '04659351')
  charlieUIContainer = await bringUpVeritableUIContainer(
    'charlie',
    3002,
    '3211809',
    'US' as CountryCode,
    'ny_state' as RegistryType
  )
  daveUIContainer = await bringUpVeritableUIContainer(
    'dave',
    3003,
    '00102498',
    'GB' as CountryCode,
    'open_corporates' as RegistryType
  )
}

export default globalSetup
