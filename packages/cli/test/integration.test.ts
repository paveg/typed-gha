import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { parse } from 'yaml'
import { runAdd } from '../src/add.js'
import { runBuild } from '../src/build.js'
import { parseArgs } from '../src/args.js'

// Absolute path to @typed-gha/core src so tmpdir workflow fixtures can import it
const CORE_SRC = resolve(new URL('../../../packages/core/src/index.ts', import.meta.url).pathname)
const CORE_PKG = resolve(new URL('../../../packages/core', import.meta.url).pathname)

const ACTION_FIXTURE = `name: Setup Tool
description: Test action
inputs:
  version:
    description: Version
    default: latest
runs:
  using: node20
  main: index.js
`

/** Set up a tmpdir that looks like an ESM project with @typed-gha/core available. */
const makeTmp = async (): Promise<string> => {
  const tmp = await mkdtemp(join(tmpdir(), 'typed-gha-int-'))
  // ESM mode required so tsx can load re-exported named bindings correctly
  await writeFile(join(tmp, 'package.json'), JSON.stringify({ type: 'module' }))
  // Wire @typed-gha/core so generated wrappers can resolve their import
  await mkdir(join(tmp, 'node_modules', '@typed-gha'), { recursive: true })
  await symlink(CORE_PKG, join(tmp, 'node_modules', '@typed-gha', 'core'))
  return tmp
}

describe('Integration: gha add → gha build pipeline', () => {
  let tmp = ''

  afterEach(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('Scenario A: runAdd generates a wrapper that runBuild can consume', async () => {
    tmp = await makeTmp()

    // 1. Create a local action fixture
    const actionDir = join(tmp, 'setup-tool')
    await mkdir(actionDir)
    await writeFile(join(actionDir, 'action.yml'), ACTION_FIXTURE)

    // 2. Generate wrapper via runAdd
    const typedActionsDir = join(tmp, 'typed-actions')
    const addResult = await runAdd({ ref: actionDir, dir: typedActionsDir })
    expect(addResult.outputPath).toMatch(/setup-tool\.ts$/)

    // 3. Verify the wrapper contains expected structure
    const wrapperContent = await readFile(addResult.outputPath, 'utf8')
    expect(wrapperContent).toContain("import { makeAction } from '@typed-gha/core/actions/_factory'")
    expect(wrapperContent).toContain('export const setupTool = makeAction<')
    expect(wrapperContent).toContain('version?: string')

    // 4. Create a workflow file that imports the generated wrapper
    const wfDir = join(tmp, '.github', 'workflows')
    await mkdir(wfDir, { recursive: true })
    await writeFile(
      join(wfDir, 'ci.workflow.ts'),
      // Use absolute core import so tsx resolves it regardless of cwd;
      // wrapper import uses relative path from the workflow file location.
      `import { defineWorkflow } from '${CORE_SRC}'
import { setupTool } from '../../typed-actions/setup-tool.js'

export default defineWorkflow({
  on: 'push',
  jobs: {
    test: {
      'runs-on': 'ubuntu-latest',
      steps: [setupTool({ with: { version: '1.0' } })],
    },
  },
})
`,
    )

    // 5. Run build and assert output
    const result = await runBuild({ cwd: tmp, check: false })
    expect(result.written).toHaveLength(1)
    expect(result.written[0]).toMatch(/ci\.yml$/)

    // 6. Parse the YAML and verify action ref is preserved
    const yml = await readFile(result.written[0] as string, 'utf8')
    const parsed = parse(yml) as Record<string, unknown>
    const steps = ((parsed.jobs as Record<string, unknown>).test as Record<string, unknown>)
      .steps as Record<string, unknown>[]
    const step0 = steps[0]
    expect(step0).toBeDefined()
    expect(step0).toHaveProperty('uses')
    // The ref is the local action path (actionDir); emitYaml serializes it as-is.
    expect(String(step0?.['uses'])).toContain('setup-tool')
  })

  it('Scenario A: generated wrapper with inputs round-trips through build to valid YAML', async () => {
    tmp = await makeTmp()

    const actionDir = join(tmp, 'my-action')
    await mkdir(actionDir)
    await writeFile(
      join(actionDir, 'action.yml'),
      `name: My Action
description: Does a thing
inputs:
  token:
    description: Auth token
  dry-run:
    description: Dry run
    default: false
runs:
  using: node20
  main: index.js
`,
    )

    const typedActionsDir = join(tmp, 'typed-actions')
    await runAdd({ ref: actionDir, dir: typedActionsDir })

    const wfDir = join(tmp, '.github', 'workflows')
    await mkdir(wfDir, { recursive: true })
    await writeFile(
      join(wfDir, 'deploy.workflow.ts'),
      `import { defineWorkflow } from '${CORE_SRC}'
import { myAction } from '../../typed-actions/my-action.js'

export default defineWorkflow({
  on: { push: { branches: ['main'] } },
  jobs: {
    deploy: {
      'runs-on': 'ubuntu-latest',
      steps: [myAction({ with: { token: 'abc', 'dry-run': false } })],
    },
  },
})
`,
    )

    const result = await runBuild({ cwd: tmp, check: false })
    expect(result.written).toHaveLength(1)

    const yml = await readFile(result.written[0] as string, 'utf8')
    const parsed = parse(yml) as Record<string, unknown>
    expect(parsed).toHaveProperty('on')
    expect((parsed.on as Record<string, unknown>)).toHaveProperty('push')
    const step = ((parsed.jobs as Record<string, unknown>).deploy as Record<string, unknown>)
      .steps as Record<string, unknown>[]
    const step0 = step[0]
    expect(step0).toBeDefined()
    expect(step0).toHaveProperty('uses')
    expect(step0).toHaveProperty('with')
    const withArgs = step0?.['with'] as Record<string, unknown>
    expect(withArgs['token']).toBe('abc')
    expect(withArgs['dry-run']).toBe(false)
  })
})

describe('Integration: parseArgs → runBuild handoff', () => {
  let tmp = ''

  afterEach(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('parseArgs build flow passes cwd and check into runBuild correctly', async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-args-'))
    const wfDir = join(tmp, '.github', 'workflows')
    await mkdir(wfDir, { recursive: true })
    await writeFile(
      join(wfDir, 'simple.workflow.ts'),
      `import { defineWorkflow } from '${CORE_SRC}'
export default defineWorkflow({
  on: 'push',
  jobs: {
    ci: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'echo ok' }] },
  },
})
`,
    )

    const args = parseArgs(['node', 'gha', 'build', '--cwd', tmp])
    expect(args.cmd).toBe('build')
    expect(args.cwd).toBe(tmp)
    expect(args.check).toBe(false)

    const result = await runBuild({ cwd: args.cwd, check: args.check })
    expect(result.written).toHaveLength(1)
    expect(result.written[0]).toMatch(/simple\.yml$/)
  })

  it('parseArgs build --check flow detects no drift on fresh output', async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-args-'))
    const wfDir = join(tmp, '.github', 'workflows')
    await mkdir(wfDir, { recursive: true })
    await writeFile(
      join(wfDir, 'ci.workflow.ts'),
      `import { defineWorkflow } from '${CORE_SRC}'
export default defineWorkflow({
  on: 'push',
  jobs: {
    ci: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'echo hi' }] },
  },
})
`,
    )

    // Write first
    const writeArgs = parseArgs(['node', 'gha', 'build', '--cwd', tmp])
    await runBuild({ cwd: writeArgs.cwd, check: writeArgs.check })

    // Check — should report no drift
    const checkArgs = parseArgs(['node', 'gha', 'build', '--check', '--cwd', tmp])
    expect(checkArgs.check).toBe(true)
    const result = await runBuild({ cwd: checkArgs.cwd, check: checkArgs.check })
    expect(result.drift).toHaveLength(0)
    expect(result.written).toHaveLength(0)
  })

  it('parseArgs add --dir flow passes dir into runAdd correctly', async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-args-'))

    // Create a local action fixture
    const actionDir = join(tmp, 'my-tool')
    await mkdir(actionDir)
    await writeFile(
      join(actionDir, 'action.yml'),
      `name: My Tool
description: A tool
runs:
  using: node20
  main: index.js
`,
    )

    const outDir = join(tmp, 'custom-out')
    const args = parseArgs(['node', 'gha', 'add', actionDir, '--dir', outDir])
    expect(args.cmd).toBe('add')
    expect(args.ref).toBe(actionDir)
    expect(args.dir).toBe(outDir)

    const result = await runAdd({ ref: args.ref, dir: args.dir })
    expect(result.outputPath).toMatch(/my-tool\.ts$/)
    expect(result.outputPath).toContain('custom-out')
  })
})
