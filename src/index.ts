import core from "@actions/core";
import tc from "@actions/tool-cache";
import exec from "@actions/exec";
import path from "path";
import fs from "fs/promises"
import {arch} from "os";

const isLinux = process.platform === 'linux';
const isDarwin = process.platform === 'darwin';
const isWin32 = process.platform === 'win32';

function assertPlatformSupported()
{
    if(!(isLinux || isDarwin || isWin32))
    {
        throw new Error('Unsupported platform');
    }
}

function getExecutablePath(directory: string)
{
    const extension = isWin32 ? "exe" : "sh";
    return path.join(directory, `steamcmd.${extension}`);
}

function getArchiveName()
{
    if (isLinux) return 'steamcmd_linux.tar.gz';
    if (isDarwin) return 'steamcmd_osx.tar.gz';
    if (isWin32) return 'steamcmd.zip';

    throw new Error('Unsupported platform');
}

function getDownloadUrl()
{
    const archiveName = getArchiveName();
    return [`https://steamcdn-a.akamaihd.net/client/installer/${archiveName}`, archiveName];
}

function getInfo(installDir: string)
{
    return isWin32 ?
    {
        directory: installDir.replace(/\\/g, "/"),
        executable: getExecutablePath(installDir).replace(/\\/g, "/"),
        binDirectory: installDir.replace(/\\/g, "/"),
    } :
    {
        directory: installDir,
        executable: getExecutablePath(installDir),
        binDirectory: path.join(installDir, "bin"),
    };
}

async function installDependencies()
{
    core.info('Installing required dependencies ...');

    if(isLinux)
    {
        await installLinuxDependencies();
        return;
    }
}

async function installLinuxDependencies()
{
    const packagesToInstall = ['lib32gcc-s1'];

    const aptUpdateStatusCode = await exec.exec('apt-get', ['--yes','update'], { ignoreReturnCode: true });

    if(aptUpdateStatusCode === 0)
    {
        await exec.exec('apt-get', ['--yes', 'install', ...packagesToInstall]);
        return;
    }

    // if previous command fails, check if the packages are already installed
    // if not, throw an error

    for (const packageToInstall of packagesToInstall)
    {
        const status = await exec.exec(
            '/usr/bin/dpkg-query', 
            ['--show', '--showformat=\'${db:Status-Status}\\n\'', packageToInstall], 
            { ignoreReturnCode: true }
        );

        if (status === 0) {
            core.info(`${packageToInstall} was already installed!`);
            continue;
        }

        throw new Error(`Failed to install ${packageToInstall}. See apt-get log.`);
    }
}

function getTempDirectory()
{
    return process.env['RUNNER_TEMP'] ?? (() => { throw new Error('Expected RUNNER_TEMP to be defined') })();
}

async function extractArchive(archivePath: string) {
    core.info('Extracting ...');

    if (isWin32)
    {
        return await tc.extractZip(archivePath, 'steamcmd');
    }

    return await tc.extractTar(archivePath, 'steamcmd');
}

async function install()
{
    //
    // Download
    //
    core.info('Downloading ...');
    const [downloadUrl, archiveName] = getDownloadUrl();

    // Why we need to set the destination directory: https://github.com/CyberAndrii/setup-steamcmd/issues/5
    const archivePath = await tc.downloadTool(downloadUrl, path.join(getTempDirectory(), archiveName));

    const extractDir = await extractArchive(archivePath);

    //
    // Cache
    //
    core.info('Adding to the cache ...');
    const installDir = await tc.cacheDir(extractDir, 'steamcmd', 'latest', 'i386');

    //
    // Install dependencies
    //
    await installDependencies();

    // Creates executable without .sh extension.
    // So we do not need to write steamcmd.sh anymore.
    if(isLinux || isDarwin)
    {
        const binDir = path.join(installDir, 'bin');
        const binExe = path.join(binDir, 'steamcmd');

        await fs.mkdir(binDir);
        await fs.writeFile(binExe, `#!/bin/bash\nexec "${installDir}/steamcmd.sh" "$@"`);
        await fs.chmod(binExe, 0o755);
    }

    core.info('Updating ...');

    const executable = getExecutablePath(installDir).replace(/\\/g, "/");
    const exitCode = await exec.exec(executable, ['+quit'], { ignoreReturnCode: isWin32 });

    // SteamCMD exits with code 7 on first run on Windows.
    if(isWin32 && exitCode === 7)
    {
        core.info('Ignoring exit code 7.');
    }

    core.info('Done');

    return getInfo(installDir);
}

async function installIfNeed()
{
    const installDir = tc.find('steamcmd', 'latest');

    if(installDir)
    {
        core.info(`Found in cache @ ${installDir}`);
        return getInfo(installDir);
    }

    return await install();
}

async function main()
{
    try
    {
        assertPlatformSupported();

        const info = await installIfNeed();

        core.setOutput('directory', info.directory);
        core.setOutput('executable', info.executable);

        core.addPath(info.binDirectory);
    }
    catch (error)
    {
        core.setFailed(error);
    }
}

void main();
