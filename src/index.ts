import * as core from '@actions/core'

import { attemptInstall } from './main'

async function wrap_install() {
  await attemptInstall().catch(error => core.setFailed(error))
}

void wrap_install()
