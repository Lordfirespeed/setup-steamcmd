import { platform } from 'os'

import { InstallSteps } from './platform-specific/AbstractInstallSteps'
import { DarwinInstallSteps } from './platform-specific/DarwinInstallSteps'
import { LinuxInstallSteps } from './platform-specific/LinuxInstallSteps'
import { WindowsInstallSteps } from './platform-specific/WindowsInstallSteps'

function chooseAppropriateInstallSteps(
  platform: NodeJS.Platform
): InstallSteps {
  if (platform === 'darwin') return new DarwinInstallSteps()

  if (platform === 'linux') return new LinuxInstallSteps()

  if (platform === 'win32') return new WindowsInstallSteps()

  throw new Error('Unsupported platform.')
}

export async function attemptInstall() {
  const installSteps = chooseAppropriateInstallSteps(platform())
  return await installSteps.installIfNecessary()
}
