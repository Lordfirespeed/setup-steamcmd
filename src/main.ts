import { platform } from 'os'
import * as core from '@actions/core'

import { InstallSteps, DarwinInstallSteps, LinuxInstallSteps, WindowsInstallSteps } from './platform-specific'

function chooseAppropriateInstallSteps(platform: NodeJS.Platform): InstallSteps {
  if (platform === 'darwin') return new DarwinInstallSteps()

  if (platform === 'linux') return new LinuxInstallSteps()

  if (platform === 'win32') return new WindowsInstallSteps()

  throw new Error('Unsupported platform.')
}

export async function attemptInstall() {
  const installSteps = chooseAppropriateInstallSteps(platform())
  const info = await installSteps.installIfNecessary()
  core.setOutput('directory', info.directory)
  core.setOutput('executable', info.executable)
  core.addPath(info.binDirectory)
}
