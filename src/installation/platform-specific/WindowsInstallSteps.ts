import path from 'path'
import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import * as exec from '@actions/exec'

import { InstallSteps } from './AbstractInstallSteps'

export class WindowsInstallSteps extends InstallSteps {
  static windowsPathToPosixPath(windowsPath: string) {
    return path.posix.format(path.win32.parse(windowsPath))
  }

  getExecutablePath(directory: string): string {
    return path.win32.join(directory, `steamcmd.exe`)
  }

  getArchiveName(): string {
    return 'steamcmd.zip'
  }

  getInfo(installDir: string): {
    directory: string
    executable: string
    binDirectory: string
  } {
    return {
      directory: WindowsInstallSteps.windowsPathToPosixPath(installDir),
      executable: WindowsInstallSteps.windowsPathToPosixPath(
        this.getExecutablePath(installDir)
      ),
      binDirectory: WindowsInstallSteps.windowsPathToPosixPath(installDir)
    }
  }

  async extractArchive(archivePath: string): Promise<string> {
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
