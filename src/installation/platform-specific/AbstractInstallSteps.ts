import path from "path";
import * as core from "@actions/core";
import * as toolCache from "@actions/tool-cache";


export abstract class InstallSteps {

    abstract getExecutablePath(directory: string): string;

    abstract getArchiveName(): string;

    abstract getInfo(installDir: string): { directory: string, executable: string, binDirectory: string };

    async extractArchive(archivePath: string): Promise<string> { throw new Error("Not implemented."); }
    async testFirstTimeRun(executable: string): Promise<void> { throw new Error("Not implemented."); }

    async installDependencies(): Promise<void> {
        return Promise.resolve();
    }

    async postInstall(cachedDir: string): Promise<void> {
        return Promise.resolve();
    }

    getDownloadUrl() {
        const archiveName = this.getArchiveName();
        return [`https://steamcdn-a.akamaihd.net/client/installer/${archiveName}`, archiveName];
    }

    getTempDirectory(): string {
        if (process.env["RUNNER_TEMP"] === undefined) {
            throw new Error('Expected RUNNER_TEMP to be defined');
        }
        return process.env['RUNNER_TEMP'];
    }

    async downloadArchive(): Promise<string> {
        const [downloadUrl, archiveName] = this.getDownloadUrl();

        // Why we need to set the destination directory: https://github.com/CyberAndrii/setup-steamcmd/issues/5
        return await toolCache.downloadTool(downloadUrl, path.join(this.getTempDirectory(), archiveName));
    }

    async cacheInstalledTool(extractDir: string): Promise<string> {
        return await toolCache.cacheDir(extractDir, 'steamcmd', 'latest', 'i386');
    }

    async install() {
        const cachedDir = await this.downloadArchive()
            .then(this.extractArchive)
            .then(this.cacheInstalledTool)

        await this.installDependencies();
        await this.postInstall(cachedDir)

        const executable = this.getExecutablePath(cachedDir);
        await this.testFirstTimeRun(executable);

        return this.getInfo(cachedDir);
    }

    async installIfNecessary() {
        const installDir = toolCache.find('steamcmd', 'latest');

        if (installDir) {
            core.info(`Found in cache @ ${installDir}`);
            return this.getInfo(installDir);
        }

        return await this.install();
    }
}
