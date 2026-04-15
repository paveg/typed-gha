import { describe, it, expect } from 'vitest'
import { defineWorkflow } from '../src/define.ts'
import type { Workflow } from '../src/types.ts'

const workflow: Workflow = {
  on: 'push',
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      steps: [{ run: 'echo hello' }],
    },
  },
}

describe('defineWorkflow', () => {
  it('returns the same reference as the input (identity)', () => {
    expect(defineWorkflow(workflow)).toBe(workflow)
  })

  it('does not mutate its input', () => {
    const input: Workflow = {
      on: 'push',
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [{ run: 'echo hello' }],
        },
      },
    }
    const before = JSON.stringify(input)
    defineWorkflow(input)
    expect(JSON.stringify(input)).toBe(before)
  })
})
