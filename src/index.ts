import * as core from '@actions/core'

import { attemptInstall } from './installation/installation'

async function main() {
  const info = await attemptInstall()
  core.setOutput('directory', info.directory)
  core.setOutput('executable', info.executable)
  core.addPath(info.binDirectory)
}

async function wrap_main() {
  await main().catch(error => core.setFailed(error))
}

void wrap_main()
