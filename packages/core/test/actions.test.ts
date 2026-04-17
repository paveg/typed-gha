import { describe, it, expect, expectTypeOf } from 'vitest'
import { parse } from 'yaml'
import { emitYaml } from '../src/emit.js'
import type { UsesStep } from '../src/types.js'
import {
  checkout,
  setupNode,
  setupPnpm,
  setupGo,
  setupPython,
  setupBun,
  cache,
  uploadArtifact,
  downloadArtifact,
  wrangler,
  awsCredentials,
} from '../src/actions/index.js'
import type {
  CheckoutInputs,
  CheckoutOutputs,
  SetupNodeInputs,
  SetupNodeOutputs,
  UploadArtifactInputs,
  UploadArtifactOutputs,
} from '../src/actions/index.js'

describe('actions runtime behavior', () => {
  it('checkout() returns uses with no with key', () => {
    const step = checkout()
    expect(step).toEqual({ uses: 'actions/checkout@v4' })
    expect('with' in step).toBe(false)
  })

  it('checkout({ with: { ref: "main" } }) includes with', () => {
    const step = checkout({ with: { ref: 'main' } })
    expect(step.uses).toBe('actions/checkout@v4')
    expect(step.with).toEqual({ ref: 'main' })
  })

  it('passes all StepBase fields and with through', () => {
    const step = checkout({
      id: 'my-id',
      name: 'My Checkout',
      if: 'always()',
      env: { FOO: 'bar' },
      'continue-on-error': true,
      'timeout-minutes': 10,
      'working-directory': './src',
      with: { ref: 'main' },
    })
    expect(step.uses).toBe('actions/checkout@v4')
    expect(step.id).toBe('my-id')
    expect(step.name).toBe('My Checkout')
    expect(step.if).toBe('always()')
    expect(step.env).toEqual({ FOO: 'bar' })
    expect(step['continue-on-error']).toBe(true)
    expect(step['timeout-minutes']).toBe(10)
    expect(step['working-directory']).toBe('./src')
    expect(step.with).toEqual({ ref: 'main' })
  })

  it('setupNode has correct uses', () => {
    const step = setupNode({ with: { 'node-version': '20' } })
    expect(step.uses).toBe('actions/setup-node@v4')
  })

  it('returned value has no __outputs key at runtime', () => {
    const step = checkout()
    expect('__outputs' in step).toBe(false)
  })

  it('emitYaml integrates checkout and setupNode into valid YAML', () => {
    const yaml = emitYaml({
      on: 'push',
      jobs: {
        t: {
          'runs-on': 'ubuntu-latest',
          steps: [
            checkout(),
            setupNode({ with: { 'node-version': '20', cache: 'pnpm' } }),
          ],
        },
      },
    })
    const parsed = parse(yaml)
    expect(parsed.jobs.t.steps[0].uses).toBe('actions/checkout@v4')
    expect(parsed.jobs.t.steps[1].uses).toBe('actions/setup-node@v4')
    expect(parsed.jobs.t.steps[1].with.cache).toBe('pnpm')
  })

  it('all action wrappers have correct uses strings', () => {
    expect(setupPnpm().uses).toBe('pnpm/action-setup@v4')
    expect(setupGo().uses).toBe('actions/setup-go@v5')
    expect(setupPython().uses).toBe('actions/setup-python@v5')
    expect(setupBun().uses).toBe('oven-sh/setup-bun@v2')
    expect(cache().uses).toBe('actions/cache@v4')
    expect(uploadArtifact().uses).toBe('actions/upload-artifact@v4')
    expect(downloadArtifact().uses).toBe('actions/download-artifact@v4')
    expect(wrangler().uses).toBe('cloudflare/wrangler-action@v3')
    expect(awsCredentials().uses).toBe('aws-actions/configure-aws-credentials@v4')
  })
})

describe('actions type-level tests', () => {
  it('setupNode cache rejects invalid values at type level', () => {
    // @ts-expect-error 'invalid' is not 'npm' | 'yarn' | 'pnpm'
    setupNode({ with: { cache: 'invalid' } })
  })

  it('setupNode cache accepts valid values', () => {
    // Should compile without error
    setupNode({ with: { cache: 'pnpm' } })
    setupNode({ with: { cache: 'npm' } })
    setupNode({ with: { cache: 'yarn' } })
  })

  it('setupNode node-version must be string not number', () => {
    // @ts-expect-error node-version must be string
    setupNode({ with: { 'node-version': 20 } })
  })

  it('uploadArtifact if-no-files-found rejects invalid values', () => {
    // @ts-expect-error 'oops' is not 'warn' | 'error' | 'ignore'
    uploadArtifact({ with: { 'if-no-files-found': 'oops' } })
  })

  it('uploadArtifact if-no-files-found accepts valid values', () => {
    // Should compile
    uploadArtifact({ with: { 'if-no-files-found': 'error' } })
    uploadArtifact({ with: { 'if-no-files-found': 'warn' } })
    uploadArtifact({ with: { 'if-no-files-found': 'ignore' } })
  })

  it('setupPython cache rejects invalid values at type level', () => {
    // @ts-expect-error 'invalid' is not 'pip' | 'pipenv' | 'poetry'
    setupPython({ with: { cache: 'invalid' } })
  })

  it('setupPython cache accepts valid values', () => {
    // Should compile without error
    setupPython({ with: { cache: 'pip' } })
    setupPython({ with: { cache: 'pipenv' } })
    setupPython({ with: { cache: 'poetry' } })
  })

  it('wrangler packageManager rejects invalid values at type level', () => {
    // @ts-expect-error 'invalid' is not 'npm' | 'yarn' | 'pnpm' | 'bun'
    wrangler({ with: { packageManager: 'invalid' } })
  })

  it('wrangler packageManager accepts valid values', () => {
    // Should compile without error
    wrangler({ with: { packageManager: 'npm' } })
    wrangler({ with: { packageManager: 'yarn' } })
    wrangler({ with: { packageManager: 'pnpm' } })
    wrangler({ with: { packageManager: 'bun' } })
  })

  it('checkout with id literal produces correctly typed UsesStep', () => {
    const step = checkout({ id: 'co' })
    // This assignment would fail if Id were widened to string instead of 'co'
    const typed: UsesStep<'actions/checkout@v4', 'co', CheckoutOutputs> = step
    expect(typed.id).toBe('co')
  })

  it('CheckoutOutputs has ref and commit fields', () => {
    expectTypeOf<CheckoutOutputs>().toHaveProperty('ref')
    expectTypeOf<CheckoutOutputs>().toHaveProperty('commit')
  })

  it('SetupNodeOutputs has node-version and cache-hit fields', () => {
    expectTypeOf<SetupNodeOutputs>().toHaveProperty('node-version')
    expectTypeOf<SetupNodeOutputs>().toHaveProperty('cache-hit')
  })
})
