import { describe, it, expect } from 'vitest'
import * as yaml from 'yaml'
import { defineWorkflow, emitYaml, secret, matrix, needs } from '../src/index.js'

/** Parse the generated YAML back to a JS object (strips the header comment). */
const roundtrip = (wf: ReturnType<typeof defineWorkflow>): Record<string, unknown> => {
  const raw = emitYaml(wf)
  return yaml.parse(raw.replace(/^#.*\n/, '')) as Record<string, unknown>
}

describe('emit → yaml.parse roundtrip', () => {
  it('preserves a non-trivial workflow with matrix, needs, env, and secrets', () => {
    const wf = defineWorkflow({
      name: 'CI',
      on: { push: { branches: ['main'] }, pull_request: {} },
      env: { NODE_AUTH_TOKEN: secret('NPM_TOKEN') },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: { 'node-version': ['20', '22'] },
          },
          steps: [{ run: 'pnpm install' }, { run: 'pnpm test', env: { CI: true } }],
        },
        deploy: {
          'runs-on': 'ubuntu-latest',
          needs: ['build'],
          steps: [
            {
              run: `echo ${needs('build', 'sha')}`,
              if: needs('build', 'sha'),
            },
          ],
        },
      },
    })

    const parsed = roundtrip(wf)

    expect(parsed).toMatchObject({
      name: 'CI',
      on: { push: { branches: ['main'] }, pull_request: {} },
      env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          strategy: { matrix: { 'node-version': ['20', '22'] } },
        },
        deploy: {
          'runs-on': 'ubuntu-latest',
          needs: ['build'],
        },
      },
    })
  })

  it('expressions survive as literal strings (not interpreted by yaml.parse)', () => {
    const wf = defineWorkflow({
      on: 'push',
      env: { TOKEN: secret('NPM_TOKEN') },
      jobs: {
        test: {
          'runs-on': matrix('os'),
          steps: [
            {
              run: 'echo ok',
              if: needs('setup', 'sha'),
            },
          ],
        },
      },
    })

    const parsed = roundtrip(wf)
    const env = parsed.env as Record<string, unknown>
    const job = (parsed.jobs as Record<string, unknown>).test as Record<string, unknown>
    const step = (job.steps as Record<string, unknown>[])[0] as Record<string, unknown>

    expect(env['TOKEN']).toBe('${{ secrets.NPM_TOKEN }}')
    expect(job['runs-on']).toBe('${{ matrix.os }}')
    expect(step['if']).toBe('${{ needs.setup.outputs.sha }}')
  })

  it('deeply nested matrix.include arrays round-trip with all keys preserved', () => {
    const wf = defineWorkflow({
      on: 'push',
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: {
              os: ['ubuntu-latest', 'macos-latest'],
              include: [
                { os: 'ubuntu-latest', node: '20', extra: 'foo' },
                { os: 'macos-latest', node: '22', extra: 'bar' },
              ],
            },
          },
          steps: [{ run: 'echo hi' }],
        },
      },
    })

    const parsed = roundtrip(wf)
    const strategy = ((parsed.jobs as Record<string, unknown>).test as Record<string, unknown>)
      .strategy as Record<string, unknown>
    const m = strategy.matrix as Record<string, unknown>

    expect(m['os']).toEqual(['ubuntu-latest', 'macos-latest'])
    expect(m['include']).toEqual([
      { os: 'ubuntu-latest', node: '20', extra: 'foo' },
      { os: 'macos-latest', node: '22', extra: 'bar' },
    ])
  })

  it('boolean env values round-trip as JavaScript booleans (not strings)', () => {
    const wf = defineWorkflow({
      on: 'push',
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          env: { CI: true, DRY_RUN: false },
          steps: [{ run: 'echo ok' }],
        },
      },
    })

    const parsed = roundtrip(wf)
    const env = ((parsed.jobs as Record<string, unknown>).build as Record<string, unknown>)
      .env as Record<string, unknown>

    expect(typeof env['CI']).toBe('boolean')
    expect(env['CI']).toBe(true)
    expect(typeof env['DRY_RUN']).toBe('boolean')
    expect(env['DRY_RUN']).toBe(false)
  })
})
