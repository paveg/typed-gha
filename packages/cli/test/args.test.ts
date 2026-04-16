import { describe, it, expect } from 'vitest'
import { parseArgs } from '../src/args.js'

describe('parseArgs', () => {
  it('defaults to build cmd with no extra args', () => {
    const result = parseArgs(['node', 'gha'])
    expect(result).toEqual({ cmd: 'build', check: false, cwd: process.cwd() })
  })

  it('parses explicit build command', () => {
    const result = parseArgs(['node', 'gha', 'build'])
    expect(result.cmd).toBe('build')
  })

  it('parses --check flag', () => {
    const result = parseArgs(['node', 'gha', 'build', '--check'])
    expect(result.check).toBe(true)
  })

  it('parses --cwd flag', () => {
    const result = parseArgs(['node', 'gha', 'build', '--cwd', '/tmp/foo'])
    expect(result.cwd).toBe('/tmp/foo')
  })

  it('throws when --cwd has no value', () => {
    expect(() => parseArgs(['node', 'gha', 'build', '--cwd'])).toThrow(/--cwd requires a value/)
  })

  it('throws on unknown flag', () => {
    expect(() => parseArgs(['node', 'gha', 'build', '--nope'])).toThrow(/Unknown flag/)
  })

  it('passes through unknown commands', () => {
    const result = parseArgs(['node', 'gha', 'something'])
    expect(result.cmd).toBe('something')
  })
})
