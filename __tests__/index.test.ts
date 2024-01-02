/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as installation from '../src/main'

// Mock the action's entrypoint
const runMock = jest.spyOn(installation, 'attemptInstall').mockImplementation(() => Promise.resolve())

describe('index', () => {
  it('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
