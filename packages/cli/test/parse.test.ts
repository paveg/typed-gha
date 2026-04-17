import { describe, it, expect } from 'vitest'
import { parseActionYaml } from '../src/parse.js'

describe('parseActionYaml', () => {
  it('extracts name and description', () => {
    const raw = `
name: My Action
description: Does something useful
inputs: {}
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.name).toBe('My Action')
    expect(result.description).toBe('Does something useful')
    expect(result.runsUsing).toBe('node20')
  })

  it('infers boolean | string from boolean default', () => {
    const raw = `
name: Test
description: test
inputs:
  lfs:
    description: Whether to download Git-LFS files
    default: false
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.key).toBe('lfs')
    expect(result.inputs[0]!.inferredType).toBe('boolean | string')
  })

  it('infers number | string from numeric default', () => {
    const raw = `
name: Test
description: test
inputs:
  fetch-depth:
    description: Number of commits to fetch
    default: 1
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.key).toBe('fetch-depth')
    expect(result.inputs[0]!.inferredType).toBe('number | string')
  })

  it('defaults to string when no default or string default', () => {
    const raw = `
name: Test
description: test
inputs:
  token:
    description: GitHub token
    default: \${{ github.token }}
  path:
    description: Relative path
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.inferredType).toBe('string')
    expect(result.inputs[1]!.inferredType).toBe('string')
  })

  it('parses required field', () => {
    const raw = `
name: Test
description: test
inputs:
  key:
    description: Cache key
    required: true
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.required).toBe(true)
  })

  it('extracts outputs', () => {
    const raw = `
name: Test
description: test
inputs: {}
outputs:
  cache-hit:
    description: Whether there was a cache hit
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.outputs).toEqual([
      { key: 'cache-hit', description: 'Whether there was a cache hit' },
    ])
  })

  it('handles empty inputs and outputs', () => {
    const raw = `
name: Minimal
description: minimal action
runs:
  using: docker
  image: Dockerfile
`
    const result = parseActionYaml(raw)
    expect(result.inputs).toEqual([])
    expect(result.outputs).toEqual([])
    expect(result.runsUsing).toBe('docker')
  })

  // --- Default value edge cases ---

  it('infers string when default is null (YAML null → JS null, not boolean/number)', () => {
    // YAML `null` parses to JS null; inferType falls through to the string branch.
    const raw = `
name: Test
description: test
inputs:
  cache-key:
    description: Cache key
    default: null
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.inferredType).toBe('string')
  })

  it('infers number | string when default is numeric zero (falsy but typeof 0 === "number")', () => {
    const raw = `
name: Test
description: test
inputs:
  fetch-depth:
    description: Number of commits to fetch
    default: 0
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.inferredType).toBe('number | string')
  })

  it('infers string when default is empty string', () => {
    const raw = `
name: Test
description: test
inputs:
  token:
    description: GitHub token
    default: ''
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.inferredType).toBe('string')
  })

  it('infers boolean | string when default is false (falsy boolean)', () => {
    // Explicit coverage for the falsy boolean case — false is typeof 'boolean'.
    const raw = `
name: Test
description: test
inputs:
  persist-credentials:
    description: Whether to persist credentials
    default: false
runs:
  using: node20
  main: index.js
`
    const result = parseActionYaml(raw)
    expect(result.inputs[0]!.inferredType).toBe('boolean | string')
  })

  it('does not crash when runs block is absent (runsUsing is empty string)', () => {
    // doc.runs ?? {} means runsUsing falls back to String(undefined ?? '') === ''.
    const raw = `
name: Test
description: test
inputs: {}
`
    const result = parseActionYaml(raw)
    expect(result.runsUsing).toBe('')
    expect(result.inputs).toEqual([])
  })

  it('parses composite actions identically', () => {
    const raw = `
name: Composite
description: composite action
inputs:
  version:
    description: Version to install
runs:
  using: composite
  steps:
    - run: echo hello
`
    const result = parseActionYaml(raw)
    expect(result.inputs).toHaveLength(1)
    expect(result.runsUsing).toBe('composite')
  })
})
