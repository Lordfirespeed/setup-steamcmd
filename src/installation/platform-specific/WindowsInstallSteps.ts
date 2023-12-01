import path from 'path'
import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import * as exec from '@actions/exec'

import { InstallSteps } from './AbstractInstallSteps'

export class WindowsInstallSteps extends InstallSteps {
  getExecutablePath(directory: string) {
    return path.join(directory, `steamcmd.exe`).replace(/\\/g, '/')
  }

  getArchiveName() {
    return 'steamcmd.zip'
  }

  getInfo(installDir: string) {
    return {
      directory: installDir.replace(/\\/g, '/'),
      executable: this.getExecutablePath(installDir).replace(/\\/g, '/'),
      binDirectory: installDir.replace(/\\/g, '/')
    }
  }

  async extractArchive(archivePath: string) {
    return await toolCache.extractZip(archivePath, 'steamcmd')
  }

  async testFirstTimeRun(executable: string): Promise<void> {
    const firstRunExitCode = await exec.exec(executable, ['+quit'], {
      ignoreReturnCode: true
    })

    // SteamCMD exits with code 7 on first run on Windows.
    if (firstRunExitCode === 7) {
      core.info('Ignoring exit code 7.')
      return
    }

    if (firstRunExitCode === 0) {
      return
    }

    throw Error(
      'SteamCMD first-run test yielded an unexpected exit code. Aborting.'
    )
  }
}
