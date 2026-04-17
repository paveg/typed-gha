import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// --- Remote fetch mocking -----------------------------------------------
// resolve.ts does: const execFile = promisify(execFileCb)
// Node's execFile has a custom promisify symbol that returns {stdout, stderr}.
// A plain vi.fn() won't carry that symbol, so promisify would resolve with a
// bare string instead of an object, breaking `const { stdout } = await execFile(...)`.
// Solution: mock node:util so that promisify returns our controlled async stub
// when called with the execFile import; all other promisify calls fall through.
//
// vi.hoisted() lifts the stub declaration above the vi.mock() factory so the
// factory closure can reference it without a TDZ error.

const { execFileStub } = vi.hoisted(() => ({
  execFileStub: vi.fn<() => Promise<{ stdout: string; stderr: string }>>(),
}))

vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  return {
    ...actual,
    promisify: (fn: unknown) => {
      // Intercept only the execFile promisify call (identified by name)
      if (typeof fn === 'function' && fn.name === 'execFile') {
        return execFileStub
      }
      return actual.promisify(fn as Parameters<typeof actual.promisify>[0])
    },
  }
})

import { resolveAction } from '../src/resolve.js'

// -------------------------------------------------------------------------

const MINIMAL_ACTION = `
name: My Action
description: Does something
runs:
  using: node20
  main: index.js
`.trim()

const MINIMAL_ACTION_B64 = Buffer.from(MINIMAL_ACTION).toString('base64')

let tmpDir: string | undefined
const originalFetch = globalThis.fetch

beforeEach(() => {
  execFileStub.mockReset()
  globalThis.fetch = vi.fn() as typeof fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true })
    tmpDir = undefined
  }
})

describe('resolveAction – local', () => {
  it('reads action.yml from a direct file path', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'typed-gha-'))
    const filePath = join(tmpDir, 'action.yml')
    await writeFile(filePath, MINIMAL_ACTION)

    const result = await resolveAction(filePath)

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.ref).toBe(filePath)
    expect(result.repoUrl).toBeNull()
  })

  it('reads action.yml from a directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'typed-gha-'))
    await writeFile(join(tmpDir, 'action.yml'), MINIMAL_ACTION)

    const result = await resolveAction(tmpDir)

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.ref).toBe(tmpDir)
    expect(result.repoUrl).toBeNull()
  })

  it('falls back to action.yaml in a directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'typed-gha-'))
    await writeFile(join(tmpDir, 'action.yaml'), MINIMAL_ACTION)

    const result = await resolveAction(tmpDir)

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.ref).toBe(tmpDir)
    expect(result.repoUrl).toBeNull()
  })

  it('throws when directory has neither action.yml nor action.yaml', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'typed-gha-'))

    await expect(resolveAction(tmpDir)).rejects.toThrow(`No action.yml found at ${tmpDir}`)
  })
})

describe('resolveAction – remote (regex)', () => {
  it('throws when ref is missing for remote input', async () => {
    execFileStub.mockRejectedValue(new Error('gh unavailable'))
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 })

    await expect(resolveAction('actions/checkout')).rejects.toThrow(
      'ref is required (e.g., actions/checkout@v4)',
    )
  })

  it('parses remote ref pattern correctly', () => {
    // Validate the regex matches the expected pattern
    const pattern = /^([^/]+)\/([^@]+)@(.+)$/
    const match = 'actions/setup-node@v4'.match(pattern)

    expect(match).not.toBeNull()
    expect(match![1]).toBe('actions')
    expect(match![2]).toBe('setup-node')
    expect(match![3]).toBe('v4')

    // Ensure owner/name without @ does NOT match
    expect('actions/checkout'.match(pattern)).toBeNull()

    // Ensure complex refs (SHA) work
    const shaMatch = 'actions/checkout@abc1234def5678'.match(pattern)
    expect(shaMatch).not.toBeNull()
    expect(shaMatch![3]).toBe('abc1234def5678')
  })
})

describe('resolveAction – remote fetch paths', () => {
  it('gh succeeds with action.yml — returns decoded content and correct repoUrl', async () => {
    execFileStub.mockResolvedValueOnce({ stdout: MINIMAL_ACTION_B64, stderr: '' })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.ref).toBe('actions/checkout@v4')
    expect(result.repoUrl).toBe('https://github.com/actions/checkout')
    expect(execFileStub).toHaveBeenCalledTimes(1)
  })

  it('gh fails on action.yml, falls back to action.yaml via gh', async () => {
    execFileStub
      .mockRejectedValueOnce(new Error('gh: not found action.yml'))
      .mockResolvedValueOnce({ stdout: MINIMAL_ACTION_B64, stderr: '' })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.repoUrl).toBe('https://github.com/actions/checkout')
    expect(execFileStub).toHaveBeenCalledTimes(2)
  })

  it('gh entirely unavailable, fetch succeeds with action.yml', async () => {
    execFileStub.mockRejectedValue(new Error('gh: command not found'))
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: async () => MINIMAL_ACTION,
    })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.repoUrl).toBe('https://github.com/actions/checkout')
    expect(execFileStub).toHaveBeenCalledTimes(2) // tried action.yml + action.yaml via gh
  })

  it('gh fails, fetch falls back action.yml→action.yaml', async () => {
    execFileStub.mockRejectedValue(new Error('gh unavailable'))
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, text: async () => MINIMAL_ACTION })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.raw).toBe(MINIMAL_ACTION)
    expect(result.repoUrl).toBe('https://github.com/actions/checkout')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondCall = fetchMock.mock.calls[1]![0] as string
    expect(secondCall).toContain('action.yaml')
  })

  it('both gh and fetch fail entirely — throws with owner/name@ref in message', async () => {
    execFileStub.mockRejectedValue(new Error('gh unavailable'))
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 })

    await expect(resolveAction('actions/checkout@v4')).rejects.toThrow(
      'actions/checkout@v4',
    )
  })

  it('base64 decode produces exact original content', async () => {
    const original = 'name: My Action\n'
    const b64 = Buffer.from(original).toString('base64')
    execFileStub.mockResolvedValueOnce({ stdout: b64, stderr: '' })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.raw).toBe(original)
  })

  it('repoUrl constructed correctly for actions/checkout@v4', async () => {
    execFileStub.mockResolvedValueOnce({ stdout: MINIMAL_ACTION_B64, stderr: '' })

    const result = await resolveAction('actions/checkout@v4')

    expect(result.repoUrl).toBe('https://github.com/actions/checkout')
  })
})
