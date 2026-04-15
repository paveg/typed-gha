import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('ci.yml generation', () => {
  it('matches committed snapshot', () => {
    const path = resolve(import.meta.dirname, '../.github/workflows/ci.yml')
    const yaml = readFileSync(path, 'utf8')
    expect(yaml).toMatchSnapshot()
  })
})
