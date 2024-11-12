import 'reflect-metadata'
import { StartedTestContainer } from 'testcontainers'
import {
  bringUpAliceDependenciesContainers,
  bringUpAliceUIContainer,
  bringUpBobContainers,
  bringUpCharlieContainers,
  bringUpSharedContainers,
} from './testcontainers/testcontainersSetup'

let sharedContainers: StartedTestContainer[]
let aliceDepsContainers: StartedTestContainer[]
let bobContainers: StartedTestContainer[]
let charlieContainers: StartedTestContainer[]
let aliceUIContainer: StartedTestContainer[]

async function globalSetup() {
  //   const __filename = fileURLToPath(import.meta.url)
  //   const __dirname = path.dirname(__filename)

  //   const envFilePath = path.resolve(__dirname, '../../docker/e2e.env')
  //   loadEnv({ path: envFilePath })

  sharedContainers = await bringUpSharedContainers()
  aliceDepsContainers = await bringUpAliceDependenciesContainers()
  aliceUIContainer = await bringUpAliceUIContainer()
  bobContainers = await bringUpBobContainers()
  charlieContainers = await bringUpCharlieContainers()
}

export default globalSetup
