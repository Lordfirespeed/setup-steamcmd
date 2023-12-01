import path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as exec from '@actions/exec'
import fs from 'fs/promises'

import { InstallSteps } from './AbstractInstallSteps'

export class DarwinInstallSteps extends InstallSteps {
  getExecutablePath(directory: string) {
    return path.join(directory, `steamcmd.sh`)
  }

  getArchiveName() {
    return 'steamcmd_osx.tar.gz'
  }

  getInfo(installDir: string) {
    return {
      directory: installDir,
      executable: this.getExecutablePath(installDir),
      binDirectory: path.join(installDir, 'bin')
    }
  }

  async extractArchive(archivePath: string) {
    return await toolCache.extractTar(archivePath, 'steamcmd')
  }

  /**
   *  Creates executable without .sh extension.
   *  So we do not need to write steamcmd.sh anymore.
   */
  async postInstall(installDir: string) {
    const binDir = path.join(installDir, 'bin')
    const binExe = path.join(binDir, 'steamcmd')

    await fs.mkdir(binDir)
    await fs.writeFile(
      binExe,
      `#!/bin/bash\nexec "${installDir}/steamcmd.sh" "$@"`
    )
    await fs.chmod(binExe, 0o755)
  }

  async testFirstTimeRun(executable: string): Promise<void> {
    await exec.exec(executable, ['+quit'], { ignoreReturnCode: false })
  }
}
