/**
 * Unit tests for the action's install functionality, src/installation/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as toolCache from '@actions/tool-cache'
import * as exec from '@actions/exec'
import process from 'process'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

import * as main from '../src/main'

// Mock the action's main function
const runMock = jest.spyOn(main, 'attemptInstall')

// Other utilities

// Mock the GitHub Actions core library
let coreDebugMock: jest.SpyInstance
let coreInfoMock: jest.SpyInstance
let coreWarningMock: jest.SpyInstance
let coreErrorMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance
let addPathMock: jest.SpyInstance

// Mock the GitHub Actions tool cache library
let findToolMock: jest.SpyInstance
let downloadToolMock: jest.SpyInstance
let extractTarMock: jest.SpyInstance<
  Promise<string>,
  [file: string, dest?: string | undefined, flags?: string | string[] | undefined]
>
let extractZipMock: jest.SpyInstance<Promise<string>, [file: string, dest?: string | undefined]>
let cacheDirMock: jest.SpyInstance

// Mock the GitHub Actions execution library
let execMock: jest.SpyInstance

// Mock the filesystem/promises library
let mkdirMock: jest.SpyInstance
let writeFileMock: jest.SpyInstance
let chmodMock: jest.SpyInstance

// Mock the os library
let platform: jest.SpyInstance<NodeJS.Platform, []>

// Mock the path library

describe('action', () => {
  const originalProcessEnv = process.env

  function mockWindowsImplementations() {
    const temp_dir = process.env.RUNNER_TEMP
    if (!temp_dir) throw new Error('$RUNNER_TEMP must be defined to mock implementations')

    downloadToolMock.mockImplementation(async (url, dest) => dest ?? path.win32.join(temp_dir, '[download-uuid'))
    extractTarMock.mockImplementation(
      async (archivePath, dest) => dest ?? path.win32.join(temp_dir, '[extract-tar-uuid]')
    )
    extractZipMock.mockImplementation(async (archivePath, dest) => {
      if (!archivePath.endsWith('.zip')) {
        throw new Error('Windows refused to unpack provided archive filename as it does not have a .zip file extension')
      }
      return dest ?? path.win32.join(temp_dir, '[extract-zip-uuid]')
    })
    cacheDirMock.mockImplementation(async (sourceDir, tool, version, arch) =>
      path.win32.join('[tool-cache]', tool, version, arch || '')
    )
  }

  function mockPosixImplementations() {
    const temp_dir = process.env.RUNNER_TEMP
    if (!temp_dir) throw new Error('$RUNNER_TEMP must be defined to mock implementations')

    downloadToolMock.mockImplementation(async (url, dest) => dest ?? path.posix.join(temp_dir, '[download-uuid]'))
    extractTarMock.mockImplementation(
      async (archivePath, dest) => dest ?? path.posix.join(temp_dir, '[extract-tar-uuid]')
    )
    extractZipMock.mockImplementation(
      async (archivePath, dest) => dest ?? path.posix.join(temp_dir, '[extract-zip-uuid]')
    )
    cacheDirMock.mockImplementation(async (sourceDir, tool, version, arch) =>
      path.posix.join('/', '[tool-cache]', tool, version, arch || '')
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()

    coreDebugMock = jest.spyOn(core, 'debug').mockImplementation()
    coreInfoMock = jest.spyOn(core, 'info').mockImplementation()
    coreWarningMock = jest.spyOn(core, 'warning').mockImplementation()
    coreErrorMock = jest.spyOn(core, 'error').mockImplementation()

    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    addPathMock = jest.spyOn(core, 'addPath').mockImplementation()

    findToolMock = jest.spyOn(toolCache, 'find').mockReturnValue('')
    downloadToolMock = jest.spyOn(toolCache, 'downloadTool').mockImplementation()
    extractTarMock = jest.spyOn(toolCache, 'extractTar').mockImplementation()
    extractZipMock = jest.spyOn(toolCache, 'extractZip').mockImplementation()
    cacheDirMock = jest.spyOn(toolCache, 'cacheDir').mockImplementation()

    execMock = jest.spyOn(exec, 'exec').mockResolvedValue(0)

    mkdirMock = jest.spyOn(fs, 'mkdir').mockImplementation()
    writeFileMock = jest.spyOn(fs, 'writeFile').mockImplementation()
    chmodMock = jest.spyOn(fs, 'chmod').mockImplementation()

    platform = jest.spyOn(os, 'platform').mockImplementation()
  })

  afterEach(() => {
    process.env = originalProcessEnv
  })

  describe('Windows', () => {
    beforeEach(() => {
      platform.mockReturnValue('win32')

      process.env.RUNNER_TEMP = 'D:\\[job]\\_temp'
      mockWindowsImplementations()
    })

    it('installs and tests the steamCMD tool on Windows', async () => {
      execMock.mockResolvedValueOnce(7)

      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(downloadToolMock).toHaveBeenCalledWith(expect.any(String), expect.any(String))
      expect(extractZipMock).toHaveBeenCalledWith(await downloadToolMock.mock.results[0].value, expect.any(String))
      expect(cacheDirMock).toHaveBeenCalledWith(
        await extractZipMock.mock.results[0].value,
        expect.stringMatching(/^steamcmd$/i),
        expect.any(String),
        expect.any(String)
      )

      const installDir = await cacheDirMock.mock.results[0].value
      const executableFile = path.win32.join(installDir, 'steamcmd.exe')
      expect(execMock).toHaveBeenCalledWith(executableFile, expect.anything(), expect.anything())
    })

    runCommonTests('Windows', 'win32')
  })

  describe('MacOS', () => {
    beforeEach(() => {
      platform.mockReturnValue('darwin')
      process.env.RUNNER_TEMP = '/tmp'
      mockPosixImplementations()
    })

    it('installs and tests the steamCMD tool on MacOS', async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(downloadToolMock).toHaveBeenCalledWith(expect.any(String), expect.any(String))
      expect(extractTarMock).toHaveBeenCalledWith(await downloadToolMock.mock.results[0].value, expect.any(String))
      expect(cacheDirMock).toHaveBeenCalledWith(
        await extractTarMock.mock.results[0].value,
        expect.stringMatching(/^steamcmd$/i),
        expect.any(String),
        expect.any(String)
      )

      const installDir = await cacheDirMock.mock.results[0].value
      const executableFile = path.posix.join(installDir, 'steamcmd.sh')
      expect(execMock).toHaveBeenCalledWith(executableFile, expect.anything(), expect.anything())
    })

    it('spoofs steamCMD binary with shell script on MacOS', async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(cacheDirMock).toHaveReturned()
      const binariesDirectory = path.posix.join(await cacheDirMock.mock.results[0].value, 'bin')
      const shellScriptFilepath = path.posix.join(binariesDirectory, 'steamcmd')

      expect(mkdirMock).toHaveBeenCalledWith(binariesDirectory)
      expect(writeFileMock).toHaveBeenCalledWith(shellScriptFilepath, expect.stringMatching(/^#!\/bin\/bash\n/m))
      expect(chmodMock).toHaveBeenCalledWith(shellScriptFilepath, expect.anything())
    })

    runCommonTests('MacOS', 'darwin')
  })

  describe('Linux', () => {
    beforeEach(() => {
      platform.mockReturnValue('linux')
      process.env.RUNNER_TEMP = '/tmp'
      mockPosixImplementations()
    })

    it('installs and tests the steamCMD tool on Linux', async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(downloadToolMock).toHaveBeenCalledWith(expect.any(String), expect.any(String))
      expect(extractTarMock).toHaveBeenCalledWith(await downloadToolMock.mock.results[0].value, expect.any(String))
      expect(cacheDirMock).toHaveBeenCalledWith(
        await extractTarMock.mock.results[0].value,
        expect.stringMatching(/^steamcmd$/i),
        expect.any(String),
        expect.any(String)
      )

      const installDir = await cacheDirMock.mock.results[0].value
      const executableFile = path.posix.join(installDir, 'steamcmd.sh')
      expect(execMock).toHaveBeenCalledWith(executableFile, expect.anything(), expect.anything())
    })

    it('spoofs steamCMD binary with shell script on Linux', async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(cacheDirMock).toHaveReturned()
      const binariesDirectory = path.posix.join(await cacheDirMock.mock.results[0].value, 'bin')
      const shellScriptFilepath = path.posix.join(binariesDirectory, 'steamcmd')

      expect(mkdirMock).toHaveBeenCalledWith(binariesDirectory)
      expect(writeFileMock).toHaveBeenCalledWith(shellScriptFilepath, expect.stringMatching(/^#!\/bin\/bash\n/m))
      expect(chmodMock).toHaveBeenCalledWith(shellScriptFilepath, expect.anything())
    })

    runCommonTests('Linux', 'linux')
  })

  function runCommonTests(platformName: string, platformIdentifier: NodeJS.Platform) {
    beforeEach(() => {
      platform.mockReturnValue(platformIdentifier)
    })

    it(`provides a valid URL to the tool cache library's \`downloadTool\` function on ${platformName}`, async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      expect(downloadToolMock).toHaveBeenCalled()
      const parseDownloadUrl = jest.fn(() => new URL(downloadToolMock.mock.calls[0][0]))
      parseDownloadUrl()
      expect(parseDownloadUrl).not.toThrow()
    })

    it(`sets action step outputs on ${platformName}`, async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      // Verify that all core library functions were called correctly
      expect(setOutputMock).toHaveBeenCalledWith('directory', expect.any(String))
      expect(setOutputMock).toHaveBeenCalledWith('executable', expect.any(String))
    })

    it(`adds binaries directory to $PATH on ${platformName}`, async () => {
      await main.attemptInstall()
      expect(runMock).toHaveReturned()

      // Verify that all core library functions were called correctly
      expect(addPathMock).toHaveBeenCalledWith(expect.any(String))
    })
  }

  describe.each<NodeJS.Platform>(['aix', 'freebsd', 'cygwin', 'openbsd', 'netbsd', 'sunos', 'android', 'haiku'])(
    'unsupported platforms',
    platformIdentifier => {
      beforeEach(() => {
        platform.mockReturnValue(platformIdentifier)
      })

      it(`throws when platform is '${platformIdentifier}'`, async () => {
        await expect(async () => await main.attemptInstall()).rejects.toThrow('Unsupported platform.')
      })
    }
  )
})
