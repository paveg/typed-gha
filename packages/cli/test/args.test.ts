import { describe, it, expect } from 'vitest'
import { parseArgs } from '../src/args.js'

describe('parseArgs', () => {
  it('defaults to build cmd with no extra args', () => {
    const result = parseArgs(['node', 'gha'])
    expect(result).toEqual({
      cmd: 'build',
      check: false,
      cwd: process.cwd(),
      ref: '',
      dir: '.github/typed-gha-actions',
    })
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

  it('parses add subcommand with ref', () => {
    const result = parseArgs(['node', 'gha', 'add', 'actions/checkout@v4'])
    expect(result.cmd).toBe('add')
    expect(result.ref).toBe('actions/checkout@v4')
    expect(result.dir).toBe('.github/typed-gha-actions')
  })

  it('parses add subcommand with --dir flag', () => {
    const result = parseArgs(['node', 'gha', 'add', 'actions/checkout@v4', '--dir', '/tmp/out'])
    expect(result.dir).toBe('/tmp/out')
  })

  it('throws when add subcommand has no ref', () => {
    expect(() => parseArgs(['node', 'gha', 'add'])).toThrow(/action ref is required/)
  })

  it('parses add subcommand with local path ref', () => {
    const result = parseArgs(['node', 'gha', 'add', './my-action'])
    expect(result.ref).toBe('./my-action')
  })
})
