import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveAction } from '../src/resolve.js'

const MINIMAL_ACTION = `
name: My Action
description: Does something
runs:
  using: node20
  main: index.js
`.trim()

let tmpDir: string | undefined

afterEach(async () => {
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

describe('resolveAction – remote', () => {
  it('throws when ref is missing for remote input', async () => {
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
