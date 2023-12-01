import path from "path";
import * as exec from "@actions/exec";
import * as core from "@actions/core";
import * as toolCache from "@actions/tool-cache";
import fs from "fs/promises"

import { InstallSteps } from "./AbstractInstallSteps";


export class LinuxInstallSteps extends InstallSteps {
    getExecutablePath(directory: string) {
        return path.join(directory, `steamcmd.sh`);
    }

    getArchiveName() {
        return 'steamcmd_linux.tar.gz';
    }

    static apt_dependencies = ['lib32gcc-s1'];
    async installDependencies() {
        const aptUpdateStatusCode = await exec.exec('sudo apt-get', ['--yes', 'update'], {ignoreReturnCode: true});
        if (aptUpdateStatusCode !== 0) {
            throw new Error("Couldn't update apt package index. Aborting.");
        }

        const aptInstallStatusCode = await exec.exec('sudo apt-get', ['--yes', 'install', ...LinuxInstallSteps.apt_dependencies], {ignoreReturnCode: true});
        if (aptInstallStatusCode === 0) return;

        const install_results = await Promise.allSettled(
            LinuxInstallSteps.apt_dependencies.map(this.checkDependencyAlreadyInstalled.bind(this))
        );

        const rejection_reasons = install_results
            .map(result => result.status == "rejected" && result.reason)
            .filter(result => result);

        if (rejection_reasons.length === 0) return;
        throw rejection_reasons.pop();
    }

    async checkDependencyAlreadyInstalled(packageSpecifier: string): Promise<void> {
        const status = await exec.exec(
            '/usr/bin/dpkg-query',
            ['--show', '--showformat=\'${db:Status-Status}\\n\'', packageSpecifier],
            {ignoreReturnCode: true}
        );

        if (status === 0) {
            core.info(`${packageSpecifier} was already installed!`);
            return;
        }

        throw new Error(`Failed to install ${packageSpecifier}. See apt-get log.`);
    }

    getInfo(installDir: string) {
        return {
            directory: installDir,
            executable: this.getExecutablePath(installDir),
            binDirectory: path.join(installDir, "bin"),
        };
    }

    async extractArchive(archivePath: string) {
        return await toolCache.extractTar(archivePath, 'steamcmd');
    }

    /**
     *  Creates executable without .sh extension.
     *  So we do not need to write steamcmd.sh anymore.
     */
    async postInstall(installDir: string) {
        const binDir = path.join(installDir, 'bin');
        const binExe = path.join(binDir, 'steamcmd');

        await fs.mkdir(binDir);
        await fs.writeFile(binExe, `#!/bin/bash\nexec "${installDir}/steamcmd.sh" "$@"`);
        await fs.chmod(binExe, 0o755);
    }

    async testFirstTimeRun(executable: string): Promise<void> {
        await exec.exec(executable, ['+quit'], {ignoreReturnCode: false});
    }
}
