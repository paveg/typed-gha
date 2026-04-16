# Phase 2: `gha add` codegen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `gha add <action-ref>` to the CLI that fetches an action's `action.yml`, infers TypeScript types from its inputs/outputs, and emits a `makeAction`-compatible wrapper file.

**Architecture:** Four new modules in `packages/cli/src/` — `resolve.ts` (fetch action.yml from local FS or GitHub), `parse.ts` (YAML → structured metadata with type inference), `generate.ts` (metadata → TypeScript source string), `add.ts` (orchestrator). The CLI's `args.ts` and `index.ts` are extended with the `add` subcommand. A single subpath export is added to `@typed-gha/core` for `./actions/_factory`.

**Tech Stack:** TypeScript, vitest, `yaml` package (already a dep of core), Node `fs/promises`, `child_process.execFile` for `gh` CLI.

---

## File map

### New files

| File | Responsibility |
|---|---|
| `packages/cli/src/parse.ts` | `parseActionYaml(raw: string): ParsedAction` — YAML string → structured inputs/outputs with inferred types |
| `packages/cli/src/generate.ts` | `generateWrapper(parsed: ParsedAction, source: ActionSource): string` — structured data → TypeScript source |
| `packages/cli/src/resolve.ts` | `resolveAction(input: string): Promise<ActionSource>` — local/remote resolver |
| `packages/cli/src/add.ts` | `runAdd(opts): Promise<AddResult>` — orchestrator: resolve → parse → generate → write |
| `packages/cli/test/parse.test.ts` | Parser unit tests |
| `packages/cli/test/generate.test.ts` | Generator unit tests |
| `packages/cli/test/resolve.test.ts` | Resolver unit tests (local only) |
| `packages/cli/test/add.test.ts` | Integration tests |

### Modified files

| File | Change |
|---|---|
| `packages/cli/src/args.ts` | Add `AddArgs` fields, extend `parseArgs` to handle `add` subcommand with positional `<ref>` + `--dir` flag |
| `packages/cli/src/index.ts` | Route `add` command to `runAdd`, print result |
| `packages/cli/test/args.test.ts` | Add test cases for `add` subcommand parsing |
| `packages/core/package.json` | Add `./actions/_factory` subpath export |

---

### Task 1: Expose `makeAction` via core subpath export

**Files:**
- Modify: `packages/core/package.json`

- [ ] **Step 1: Add the subpath export**

In `packages/core/package.json`, add `./actions/_factory` to the `exports` map:

```json
"./actions/_factory": {
  "types": "./dist/actions/_factory.d.ts",
  "import": "./dist/actions/_factory.js"
}
```

- [ ] **Step 2: Rebuild core to ensure dist files exist**

Run: `pnpm --filter @typed-gha/core build`
Expected: exit 0, `packages/core/dist/actions/_factory.js` and `.d.ts` exist.

- [ ] **Step 3: Verify the export resolves**

Run: `node --input-type=module -e "import('@typed-gha/core/actions/_factory').then(m => console.log(typeof m.makeAction))"`
Expected: `function`

- [ ] **Step 4: Commit**

```
git add packages/core/package.json
git commit -m "feat(core): expose makeAction via ./actions/_factory subpath export

Phase 2 codegen wrappers import makeAction from this path so they
are decoupled from the internal _factory module structure."
```

---

### Task 2: Parser — `parseActionYaml`

**Files:**
- Create: `packages/cli/src/parse.ts`
- Create: `packages/cli/test/parse.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/cli/test/parse.test.ts`:

```ts
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
    expect(result.outputs).toEqual([{ key: 'cache-hit', description: 'Whether there was a cache hit' }])
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
```

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `parse.js` does not exist or `parseActionYaml` is not a function.

- [ ] **Step 3: Implement `parse.ts`**

`packages/cli/src/parse.ts`:

```ts
import { parse } from 'yaml'

export type ParsedInput = {
  key: string
  description: string
  required: boolean
  default?: string | boolean | number
  inferredType: 'string' | 'boolean | string' | 'number | string'
}

export type ParsedOutput = {
  key: string
  description: string
}

export type ParsedAction = {
  name: string
  description: string
  inputs: ParsedInput[]
  outputs: ParsedOutput[]
  runsUsing: string
}

const inferType = (defaultValue: unknown): ParsedInput['inferredType'] => {
  if (typeof defaultValue === 'boolean') return 'boolean | string'
  if (typeof defaultValue === 'number') return 'number | string'
  return 'string'
}

export const parseActionYaml = (raw: string): ParsedAction => {
  const doc = parse(raw) as Record<string, unknown>

  const rawInputs = (doc.inputs ?? {}) as Record<string, Record<string, unknown>>
  const rawOutputs = (doc.outputs ?? {}) as Record<string, Record<string, unknown>>
  const runs = (doc.runs ?? {}) as Record<string, unknown>

  const inputs: ParsedInput[] = Object.entries(rawInputs).map(([key, val]) => ({
    key,
    description: String(val.description ?? ''),
    required: val.required === true,
    ...(val.default !== undefined ? { default: val.default as string | boolean | number } : {}),
    inferredType: inferType(val.default),
  }))

  const outputs: ParsedOutput[] = Object.entries(rawOutputs).map(([key, val]) => ({
    key,
    description: String(val.description ?? ''),
  }))

  return {
    name: String(doc.name ?? ''),
    description: String(doc.description ?? ''),
    inputs,
    outputs,
    runsUsing: String(runs.using ?? ''),
  }
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: 8 new tests PASS. All tests green.

- [ ] **Step 5: Commit**

```
git add packages/cli/src/parse.ts packages/cli/test/parse.test.ts
git commit -m "feat(cli): action.yml parser with boolean/number type inference"
```

---

### Task 3: Code generator — `generateWrapper`

**Files:**
- Create: `packages/cli/src/generate.ts`
- Create: `packages/cli/test/generate.test.ts`

Before writing the generator test, create a minimal type-only stub for the `ActionSource` type that the generator needs. This stub will be replaced by the full resolver in Task 4.

Create `packages/cli/src/resolve.ts` (type-only stub):

```ts
export type ActionSource = {
  raw: string
  ref: string
  repoUrl: string | null
}
```

- [ ] **Step 1: Write failing tests**

`packages/cli/test/generate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateWrapper } from '../src/generate.js'
import type { ParsedAction } from '../src/parse.js'
import type { ActionSource } from '../src/resolve.js'

const makeSource = (ref: string, repoUrl: string | null = null): ActionSource => ({
  raw: '',
  ref,
  repoUrl,
})

const minimalAction: ParsedAction = {
  name: 'My Action',
  description: 'Does things',
  inputs: [],
  outputs: [],
  runsUsing: 'node20',
}

describe('generateWrapper', () => {
  it('includes header comment with source ref', () => {
    const result = generateWrapper(minimalAction, makeSource('owner/name@v1'))
    expect(result).toContain('// Generated by typed-gha from owner/name@v1. Do not edit by hand.')
  })

  it('imports makeAction from @typed-gha/core/actions/_factory', () => {
    const result = generateWrapper(minimalAction, makeSource('owner/name@v1'))
    expect(result).toContain("import { makeAction } from '@typed-gha/core/actions/_factory'")
  })

  it('generates camelCase function name from ref', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/setup-node@v4'))
    expect(result).toContain('export const setupNode = makeAction<')
  })

  it('generates PascalCase type names from ref', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/setup-node@v4'))
    expect(result).toContain('export type SetupNodeInputs')
    expect(result).toContain('export type SetupNodeOutputs')
  })

  it('derives names from single-segment ref', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/checkout@v4'))
    expect(result).toContain('export const checkout = makeAction<')
    expect(result).toContain('export type CheckoutInputs')
  })

  it('renders boolean | string type for boolean-default inputs', () => {
    const action: ParsedAction = {
      ...minimalAction,
      inputs: [{ key: 'lfs', description: 'Use LFS', required: false, default: false, inferredType: 'boolean | string' }],
    }
    const result = generateWrapper(action, makeSource('actions/checkout@v4'))
    expect(result).toContain('lfs?: boolean | string')
  })

  it('renders number | string type for numeric-default inputs', () => {
    const action: ParsedAction = {
      ...minimalAction,
      inputs: [{ key: 'fetch-depth', description: 'Depth', required: false, default: 1, inferredType: 'number | string' }],
    }
    const result = generateWrapper(action, makeSource('actions/checkout@v4'))
    expect(result).toContain("'fetch-depth'?: number | string")
  })

  it('adds @defaultValue tag when default exists', () => {
    const action: ParsedAction = {
      ...minimalAction,
      inputs: [{ key: 'clean', description: 'Clean', required: false, default: true, inferredType: 'boolean | string' }],
    }
    const result = generateWrapper(action, makeSource('actions/checkout@v4'))
    expect(result).toContain('@defaultValue true')
  })

  it('adds @see link when repoUrl is provided', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/checkout@v4', 'https://github.com/actions/checkout'))
    expect(result).toContain('@see https://github.com/actions/checkout')
  })

  it('omits @see when repoUrl is null', () => {
    const result = generateWrapper(minimalAction, makeSource('./local/action'))
    expect(result).not.toContain('@see')
  })

  it('renders outputs', () => {
    const action: ParsedAction = {
      ...minimalAction,
      outputs: [{ key: 'cache-hit', description: 'Whether hit' }],
    }
    const result = generateWrapper(action, makeSource('actions/cache@v4'))
    expect(result).toContain("'cache-hit': string")
  })

  it('uses Record<string, never> for empty outputs', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/checkout@v4'))
    expect(result).toContain('Record<string, never>')
  })

  it('passes ref through to makeAction generic and call', () => {
    const result = generateWrapper(minimalAction, makeSource('actions/checkout@v4'))
    expect(result).toContain("'actions/checkout@v4',")
    expect(result).toContain("('actions/checkout@v4')")
  })
})
```

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `generateWrapper` not found.

- [ ] **Step 3: Implement `generate.ts`**

`packages/cli/src/generate.ts`:

```ts
import type { ParsedAction, ParsedInput } from './parse.js'
import type { ActionSource } from './resolve.js'

const toCamelCase = (s: string): string =>
  s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toLowerCase())

const toPascalCase = (s: string): string =>
  s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase())

const deriveBaseName = (source: ActionSource): string => {
  const match = source.ref.match(/(?:.*\/)?([^/@]+)/)
  return match?.[1] ?? 'action'
}

const quoteKey = (key: string): string =>
  /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`

const renderInputField = (input: ParsedInput): string => {
  const lines: string[] = []
  if (input.description) {
    const defaultTag = input.default !== undefined ? ` @defaultValue ${JSON.stringify(input.default)}` : ''
    lines.push(`  /** ${input.description}${defaultTag} */`)
  } else if (input.default !== undefined) {
    lines.push(`  /** @defaultValue ${JSON.stringify(input.default)} */`)
  }
  lines.push(`  ${quoteKey(input.key)}?: ${input.inferredType}`)
  return lines.join('\n')
}

export const generateWrapper = (parsed: ParsedAction, source: ActionSource): string => {
  const baseName = deriveBaseName(source)
  const funcName = toCamelCase(baseName)
  const typeName = toPascalCase(baseName)
  const ref = source.ref

  const lines: string[] = []

  lines.push(`// Generated by typed-gha from ${ref}. Do not edit by hand.`)
  lines.push(`import { makeAction } from '@typed-gha/core/actions/_factory'`)
  lines.push('')

  lines.push('/**')
  lines.push(` * ${parsed.name}`)
  if (parsed.description) {
    lines.push(` *`)
    lines.push(` * ${parsed.description}`)
  }
  if (source.repoUrl) {
    lines.push(` *`)
    lines.push(` * @see ${source.repoUrl}`)
  }
  lines.push(' */')
  lines.push('')

  if (parsed.inputs.length > 0) {
    lines.push(`export type ${typeName}Inputs = {`)
    for (const input of parsed.inputs) {
      lines.push(renderInputField(input))
    }
    lines.push('}')
  } else {
    lines.push(`export type ${typeName}Inputs = Record<string, never>`)
  }
  lines.push('')

  if (parsed.outputs.length > 0) {
    lines.push(`export type ${typeName}Outputs = {`)
    for (const output of parsed.outputs) {
      if (output.description) lines.push(`  /** ${output.description} */`)
      lines.push(`  ${quoteKey(output.key)}: string`)
    }
    lines.push('}')
  } else {
    lines.push(`export type ${typeName}Outputs = Record<string, never>`)
  }
  lines.push('')

  lines.push(`export const ${funcName} = makeAction<`)
  lines.push(`  '${ref}',`)
  lines.push(`  ${typeName}Inputs,`)
  lines.push(`  ${typeName}Outputs`)
  lines.push(`>('${ref}')`)
  lines.push('')

  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -25`
Expected: All 12 generate tests + 8 parse tests + 13 existing = 33 PASS.

- [ ] **Step 5: Commit**

```
git add packages/cli/src/generate.ts packages/cli/src/resolve.ts packages/cli/test/generate.test.ts
git commit -m "feat(cli): code generator emitting makeAction-compatible wrappers

Transforms ParsedAction into a TypeScript source file with camelCase
function names, PascalCase type names, boolean/number inferred types,
@defaultValue tags, and @see links from repoUrl."
```

---

### Task 4: Resolver — `resolveAction`

**Files:**
- Modify: `packages/cli/src/resolve.ts` (replace type-only stub with full implementation)
- Create: `packages/cli/test/resolve.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/cli/test/resolve.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveAction } from '../src/resolve.js'

describe('resolveAction', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-resolve-'))
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('reads action.yml from a direct file path', async () => {
    const file = join(tmp, 'action.yml')
    await writeFile(file, 'name: Test\ndescription: test\n')
    const result = await resolveAction(file)
    expect(result.raw).toContain('name: Test')
    expect(result.repoUrl).toBeNull()
  })

  it('reads action.yml from a directory', async () => {
    const dir = join(tmp, 'my-action')
    await mkdir(dir)
    await writeFile(join(dir, 'action.yml'), 'name: DirAction\n')
    const result = await resolveAction(dir)
    expect(result.raw).toContain('name: DirAction')
    expect(result.ref).toBe(dir)
  })

  it('falls back to action.yaml in a directory', async () => {
    const dir = join(tmp, 'yaml-action')
    await mkdir(dir)
    await writeFile(join(dir, 'action.yaml'), 'name: YamlAction\n')
    const result = await resolveAction(dir)
    expect(result.raw).toContain('name: YamlAction')
  })

  it('throws when directory has neither action.yml nor action.yaml', async () => {
    const dir = join(tmp, 'empty-action')
    await mkdir(dir)
    await expect(resolveAction(dir)).rejects.toThrow(/No action\.yml found/)
  })

  it('throws when ref is missing for remote input', async () => {
    await expect(resolveAction('actions/checkout')).rejects.toThrow(/ref is required/)
  })

  it('parses remote ref pattern correctly', () => {
    expect('actions/checkout@v4'.match(/^([^/]+)\/([^@]+)@(.+)$/)).toBeTruthy()
    expect('owner/name@main'.match(/^([^/]+)\/([^@]+)@(.+)$/)).toBeTruthy()
    expect('actions/checkout'.match(/^([^/]+)\/([^@]+)@(.+)$/)).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `resolveAction` is not exported (only the `ActionSource` type exists).

- [ ] **Step 3: Implement `resolve.ts`**

Replace `packages/cli/src/resolve.ts`:

```ts
import { readFile, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type ActionSource = {
  raw: string
  ref: string
  repoUrl: string | null
}

const isLocalPath = (input: string): boolean =>
  input.startsWith('./') || input.startsWith('../') || input.startsWith('/')

const readLocalAction = async (path: string): Promise<string> => {
  const info = await stat(path)
  if (info.isFile()) return readFile(path, 'utf8')

  for (const name of ['action.yml', 'action.yaml']) {
    try {
      return await readFile(`${path}/${name}`, 'utf8')
    } catch {
      continue
    }
  }
  throw new Error(`No action.yml found at ${path}`)
}

const fetchViaGh = async (owner: string, name: string, ref: string): Promise<string | null> => {
  for (const filename of ['action.yml', 'action.yaml']) {
    try {
      const { stdout } = await execFileAsync('gh', [
        'api', `repos/${owner}/${name}/contents/${filename}?ref=${ref}`,
        '--jq', '.content',
      ])
      return Buffer.from(stdout.trim(), 'base64').toString('utf8')
    } catch {
      continue
    }
  }
  return null
}

const fetchViaHttp = async (owner: string, name: string, ref: string): Promise<string | null> => {
  for (const filename of ['action.yml', 'action.yaml']) {
    const url = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${filename}`
    const res = await fetch(url)
    if (res.ok) return res.text()
  }
  return null
}

export const resolveAction = async (input: string): Promise<ActionSource> => {
  if (isLocalPath(input)) {
    const raw = await readLocalAction(input)
    return { raw, ref: input, repoUrl: null }
  }

  const match = input.match(/^([^/]+)\/([^@]+)@(.+)$/)
  if (!match) {
    throw new Error(`ref is required (e.g., ${input}@v4)`)
  }

  const [, owner, name, ref] = match as [string, string, string, string]

  const ghResult = await fetchViaGh(owner, name, ref).catch(() => null)
  if (ghResult) return { raw: ghResult, ref: input, repoUrl: `https://github.com/${owner}/${name}` }

  const httpResult = await fetchViaHttp(owner, name, ref)
  if (httpResult) return { raw: httpResult, ref: input, repoUrl: `https://github.com/${owner}/${name}` }

  throw new Error(`No action.yml found at ${owner}/${name}@${ref}`)
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -25`
Expected: 6 resolve tests PASS. All tests green.

- [ ] **Step 5: Commit**

```
git add packages/cli/src/resolve.ts packages/cli/test/resolve.test.ts
git commit -m "feat(cli): action.yml resolver for local paths and GitHub remote

Supports direct file paths, directories (action.yml/action.yaml
fallback), and owner/name@ref remote refs via gh CLI with raw
githubusercontent.com fallback."
```

---

### Task 5: CLI args — extend `parseArgs` for `add` subcommand

**Files:**
- Modify: `packages/cli/src/args.ts`
- Modify: `packages/cli/test/args.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `packages/cli/test/args.test.ts`:

```ts
  it('parses add subcommand with action ref', () => {
    const result = parseArgs(['node', 'gha', 'add', 'actions/checkout@v4'])
    expect(result.cmd).toBe('add')
    expect(result.ref).toBe('actions/checkout@v4')
    expect(result.dir).toBe('.github/typed-gha-actions')
  })

  it('parses add with --dir flag', () => {
    const result = parseArgs(['node', 'gha', 'add', 'actions/checkout@v4', '--dir', '/tmp/out'])
    expect(result.dir).toBe('/tmp/out')
  })

  it('throws when add has no ref argument', () => {
    expect(() => parseArgs(['node', 'gha', 'add'])).toThrow(/action ref is required/)
  })

  it('parses add with local path ref', () => {
    const result = parseArgs(['node', 'gha', 'add', './my-action'])
    expect(result.ref).toBe('./my-action')
  })
```

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `result.ref` and `result.dir` don't exist on the return type.

- [ ] **Step 3: Implement args changes**

Replace `packages/cli/src/args.ts`:

```ts
export type CliArgs = {
  cmd: string
  check: boolean
  cwd: string
  ref: string
  dir: string
}

export const parseArgs = (argv: readonly string[]): CliArgs => {
  const cmd = argv[2] ?? 'build'
  const args: CliArgs = {
    cmd,
    check: false,
    cwd: process.cwd(),
    ref: '',
    dir: '.github/typed-gha-actions',
  }

  if (cmd === 'add') {
    const ref = argv[3]
    if (!ref || ref.startsWith('--')) throw new Error('action ref is required (e.g., gha add actions/checkout@v4)')
    args.ref = ref
    for (let i = 4; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--dir') {
        const next = argv[i + 1]
        if (next === undefined) throw new Error('--dir requires a value')
        args.dir = next
        i++
      } else {
        throw new Error(`Unknown flag: ${arg}`)
      }
    }
  } else {
    for (let i = 3; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--check') args.check = true
      else if (arg === '--cwd') {
        const next = argv[i + 1]
        if (next === undefined) throw new Error('--cwd requires a value')
        args.cwd = next
        i++
      } else {
        throw new Error(`Unknown flag: ${arg}`)
      }
    }
  }

  return args
}
```

- [ ] **Step 4: Update imports in `index.ts` and tests**

Replace `BuildArgs` with `CliArgs` in any imports. The existing test assertions (`cmd`, `check`, `cwd`) remain valid on the wider `CliArgs` type.

- [ ] **Step 5: Run tests to verify green**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -25`
Expected: All args tests pass (7 existing + 4 new = 11).

- [ ] **Step 6: Commit**

```
git add packages/cli/src/args.ts packages/cli/test/args.test.ts
git commit -m "feat(cli): extend parseArgs with add subcommand and --dir flag"
```

---

### Task 6: Orchestrator + CLI routing — `runAdd` and `index.ts`

**Files:**
- Create: `packages/cli/src/add.ts`
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/test/add.test.ts`

- [ ] **Step 1: Write failing integration tests**

`packages/cli/test/add.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAdd } from '../src/add.js'

const FIXTURE = `
name: Setup Node
description: Set up a Node.js environment
inputs:
  node-version:
    description: Version Spec of the version to use
  lfs:
    description: Whether to download Git-LFS files
    default: false
  fetch-depth:
    description: Number of commits to fetch
    default: 1
outputs:
  node-version:
    description: The installed node version
  cache-hit:
    description: Whether there was a cache hit
runs:
  using: node20
  main: index.js
`

describe('runAdd', () => {
  let tmp: string
  let outDir: string
  let actionDir: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-add-'))
    outDir = join(tmp, 'out')
    actionDir = join(tmp, 'setup-node')
    await mkdir(actionDir)
    await writeFile(join(actionDir, 'action.yml'), FIXTURE)
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('generates a wrapper file from a local action.yml', async () => {
    const result = await runAdd({ ref: actionDir, dir: outDir })
    expect(result.outputPath).toMatch(/setup-node\.ts$/)
    const content = await readFile(result.outputPath, 'utf8')
    expect(content).toContain('// Generated by typed-gha from')
    expect(content).toContain("'node-version'?: string")
    expect(content).toContain('lfs?: boolean | string')
    expect(content).toContain("'fetch-depth'?: number | string")
    expect(content).toContain("'cache-hit': string")
    expect(content).toContain('export const setupNode = makeAction<')
  })

  it('overwrites existing file idempotently', async () => {
    await runAdd({ ref: actionDir, dir: outDir })
    const first = await readFile(join(outDir, 'setup-node.ts'), 'utf8')
    await runAdd({ ref: actionDir, dir: outDir })
    const second = await readFile(join(outDir, 'setup-node.ts'), 'utf8')
    expect(first).toBe(second)
  })

  it('respects --dir option', async () => {
    const customDir = join(tmp, 'custom')
    const result = await runAdd({ ref: actionDir, dir: customDir })
    expect(result.outputPath).toContain('custom/')
  })

  it('uses action dir name for the output file', async () => {
    const result = await runAdd({ ref: actionDir, dir: outDir })
    expect(result.outputPath).toMatch(/setup-node\.ts$/)
  })
})
```

- [ ] **Step 2: Run tests to verify red**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -20`
Expected: FAIL — `add.js` does not exist.

- [ ] **Step 3: Implement `add.ts`**

`packages/cli/src/add.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, basename, dirname } from 'node:path'
import { resolveAction, type ActionSource } from './resolve.js'
import { parseActionYaml } from './parse.js'
import { generateWrapper } from './generate.js'

export type AddResult = {
  outputPath: string
  ref: string
}

const deriveFileName = (source: ActionSource): string => {
  const remoteMatch = source.ref.match(/^([^/]+)\/([^@]+)@/)
  if (remoteMatch) return `${remoteMatch[1]}-${remoteMatch[2]}.ts`

  const clean = source.ref.replace(/\/+$/, '').replace(/\/action\.ya?ml$/, '')
  const name = basename(clean)
  const parent = basename(dirname(clean))
  return parent && parent !== '.' && parent !== '..' ? `${parent}-${name}.ts` : `${name}.ts`
}

export const runAdd = async (opts: { ref: string; dir: string }): Promise<AddResult> => {
  const source = await resolveAction(opts.ref)
  const parsed = parseActionYaml(source.raw)
  const code = generateWrapper(parsed, source)
  const fileName = deriveFileName(source)
  const outDir = resolve(opts.dir)
  await mkdir(outDir, { recursive: true })
  const outputPath = resolve(outDir, fileName)
  await writeFile(outputPath, code)
  return { outputPath, ref: opts.ref }
}
```

- [ ] **Step 4: Wire `add` into `index.ts`**

Replace `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env -S npx tsx
import { runBuild } from './build.js'
import { runAdd } from './add.js'
import { parseArgs } from './args.js'

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv)

  if (args.cmd === 'build') {
    const result = await runBuild({ cwd: args.cwd, check: args.check })
    for (const p of result.written) process.stdout.write(`wrote: ${p}\n`)
    for (const p of result.drift) process.stderr.write(`drift: ${p}\n`)
    if (args.check && result.drift.length > 0) process.exit(1)
  } else if (args.cmd === 'add') {
    const result = await runAdd({ ref: args.ref, dir: args.dir })
    process.stdout.write(`generated: ${result.outputPath}\n`)
  } else {
    process.stderr.write(`Unknown command: ${args.cmd}\n`)
    process.exit(2)
  }
}

void main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.stack ?? e.message : String(e)}\n`)
  process.exit(1)
})
```

- [ ] **Step 5: Run tests to verify green**

Run: `pnpm --filter @typed-gha/cli test -- --reporter verbose 2>&1 | tail -30`
Expected: 4 add tests + all prior tests PASS.

- [ ] **Step 6: Full test suite + typecheck**

Run: `pnpm -r typecheck 2>&1 | tail -10 && pnpm -r test 2>&1 | grep -E "Tests|FAIL"`
Expected: All packages green. ~85 total tests (51 existing + ~34 new).

- [ ] **Step 7: Commit**

```
git add packages/cli/src/add.ts packages/cli/src/index.ts packages/cli/test/add.test.ts
git commit -m "feat(cli): gha add orchestrator and CLI routing

Wires resolve → parse → generate → write pipeline into the gha CLI.
Derives output file name from action ref (owner-name.ts for remote,
parent-name.ts for local). Creates output directory if needed."
```

---

### Task 7: Build, smoke test, end-to-end verification

**Files:**
- No new files — verification only.

- [ ] **Step 1: Build all packages**

Run: `pnpm -r --filter './packages/*' build 2>&1 | tail -10`
Expected: Both core and cli build to dist/ without errors.

- [ ] **Step 2: Smoke test with a local action.yml fixture**

```bash
mkdir -p /tmp/test-action
cat > /tmp/test-action/action.yml <<'EOF'
name: Test Action
description: A test action for smoke testing
inputs:
  verbose:
    description: Enable verbose output
    default: false
  retries:
    description: Number of retries
    default: 3
outputs:
  result:
    description: The result
runs:
  using: node20
  main: index.js
EOF

node packages/cli/dist/index.js add /tmp/test-action --dir /tmp/test-output
cat /tmp/test-output/test-action.ts
```

Expected: file contains `verbose?: boolean | string`, `retries?: number | string`, `result: string`.

- [ ] **Step 3: Smoke test with a real remote action (optional, requires network)**

Run: `node packages/cli/dist/index.js add actions/checkout@v4 --dir /tmp/test-remote`
Expected: `generated: /tmp/test-remote/actions-checkout.ts` — file contains `export const checkout = makeAction<`.

- [ ] **Step 4: Full suite final run**

Run: `pnpm -r typecheck && pnpm -r test`
Expected: All green. Show exact test count and exit codes.

- [ ] **Step 5: Commit (only if smoke tests required fixups)**

---

## Summary

| Task | What | New tests |
|---|---|---|
| 1 | Core subpath export for `_factory` | 0 (manual verification) |
| 2 | Parser (`parseActionYaml`) | 8 |
| 3 | Generator (`generateWrapper`) | 12 |
| 4 | Resolver (`resolveAction`) | 6 |
| 5 | CLI args extension | 4 |
| 6 | Orchestrator + routing | 4 |
| 7 | Build + smoke verification | 0 |
| **Total** | | **~34 new tests** |
