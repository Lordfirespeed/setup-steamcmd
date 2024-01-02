import path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as exec from '@actions/exec'
import fs from 'fs/promises'

import { InstallSteps } from './abstract.install.steps'

export class DarwinInstallSteps extends InstallSteps {
  getExecutablePath(directory: string): string {
    return path.join(directory, `steamcmd.sh`)
  }

  getArchiveName(): string {
    return 'steamcmd_osx.tar.gz'
  }

  getInfo(installDir: string): {
    directory: string
    executable: string
    binDirectory: string
  } {
    return {
      directory: installDir,
      executable: this.getExecutablePath(installDir),
      binDirectory: path.join(installDir, 'bin')
    }
  }

  async extractArchive(archivePath: string): Promise<string> {
    return await toolCache.extractTar(archivePath, 'steamcmd')
  }

  /**
   *  Creates executable without .sh extension.
   *  So we do not need to write steamcmd.sh anymore.
   */
  async postInstall(installDir: string): Promise<void> {
    const binDir = path.join(installDir, 'bin')
    const binExe = path.join(binDir, 'steamcmd')

    await fs.mkdir(binDir)
    await fs.writeFile(binExe, `#!/bin/bash\nexec "${installDir}/steamcmd.sh" "$@"`)
    await fs.chmod(binExe, 0o755)
  }

  async testFirstTimeRun(executable: string): Promise<void> {
    await exec.exec(executable, ['+quit'], { ignoreReturnCode: false })
  }
}
