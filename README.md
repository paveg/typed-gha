# typed-gha

Type-safe GitHub Actions workflows in TypeScript.

Write workflows as `.workflow.ts` files. Run `gha build` to emit the YAML. Use
`gha build --check` in CI to fail if committed YAML has drifted from source.

## What you get

- **`defineWorkflow(...)`** — identity function with a `const` type parameter that
  preserves every literal string in your workflow object, enabling future
  cross-job output inference without losing type information at the call site.
- **11 typed action wrappers** — `checkout`, `setupNode`, `setupPnpm`, `setupGo`,
  `setupPython`, `setupBun`, `cache`, `uploadArtifact`, `downloadArtifact`,
  `wrangler`, `awsCredentials`. Each wrapper's `with` block is fully typed.
  Four fields are narrowed to enum literals (`setup-node` / `setup-python`
  `cache`, `upload-artifact` `if-no-files-found`, `wrangler` `packageManager`)
  — passing an unknown value is a compile error.
- **`gha build` CLI** — discovers every `*.workflow.ts` under your project,
  compiles each one, and writes a `.yml` file next to the source. `--check` mode
  diffs the generated YAML against the committed file and exits 1 on any drift.
- **`gha add` codegen** — point at any action's `action.yml` (local path or
  `owner/repo@ref` on GitHub) and a typed wrapper file is generated using the
  same `makeAction` shape as the curated set. Drop-in compatible with the
  handwritten wrappers above.
- **Pure functional API** — workflows are plain TypeScript values. No classes, no
  builder chains. Compose with destructuring and spread like any other object.

## Quickstart

```bash
pnpm add -D @typed-gha/core @typed-gha/cli
mkdir -p .github/workflows
```

Create `.github/workflows/ci.workflow.ts`:

```ts
import { defineWorkflow } from '@typed-gha/core'
import { checkout, setupNode } from '@typed-gha/core/actions'

export default defineWorkflow({
  on: 'push',
  jobs: {
    test: {
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout(),
        setupNode({ with: { 'node-version': '22', cache: 'pnpm' } }),
      ],
    },
  },
})
```

Build:

```bash
pnpm exec gha build
# → .github/workflows/ci.yml written
```

Add to `.gitignore` if you prefer not to commit the generated YAML, or commit it
and enforce drift-free CI (see below).

## Drift enforcement in CI

The most valuable usage pattern: commit the generated `.yml` files, then fail
the build if source and committed output diverge.

```yaml
jobs:
  workflow-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec gha build --check
```

`gha build --check` exits 0 when every committed `.yml` matches its source,
exits 1 (with a list of drifted paths on stderr) otherwise.

## Expression helpers

Typed helpers produce the correct `${{ ... }}` strings:

```ts
import { secret, needs, matrix, stepOutput, variable, github, env, expr } from '@typed-gha/core'

secret('NPM_TOKEN')          // ${{ secrets.NPM_TOKEN }}
needs('build', 'sha')        // ${{ needs.build.outputs.sha }}
matrix('node-version')       // ${{ matrix.node-version }}
stepOutput('meta', 'digest') // ${{ steps.meta.outputs.digest }}
variable('DEPLOY_ENV')       // ${{ vars.DEPLOY_ENV }}
github('ref')                // ${{ github.ref }}
env('MY_FLAG')               // ${{ env.MY_FLAG }}
expr("contains(github.ref, 'main')") // ${{ contains(github.ref, 'main') }}
```

All helpers return plain strings, so they slot into any field that accepts a
GitHub Actions expression.

## Generating wrappers for arbitrary actions

The curated 11 wrappers cover the most common actions, but any action with an
`action.yml` can be added on demand:

```bash
# Remote — fetched via gh CLI (with private-repo auth) or raw.githubusercontent
pnpm exec gha add actions/setup-go@v5
# → .github/typed-gha-actions/actions-setup-go.ts

# Local — composite action in the same repo or a sibling path
pnpm exec gha add ./actions/my-internal-action

# Custom output directory
pnpm exec gha add actions/cache@v4 --dir src/generated/actions
```

The generated file is committed to your repo. Re-run the same command after a
ref bump (`@v5` → `@v6`) to regenerate. Type inference applies a small set of
heuristics from the action's `default` values:

| `action.yml` says | Generated TS type |
| --- | --- |
| `default: false` / `default: true` | `boolean \| string` |
| `default: 1` (any number) | `number \| string` |
| `default: "foo"` or no default | `string` |

Outputs are always typed as `string` (matches GitHub Actions' runtime contract).

Import the generated wrapper directly from your workflow file:

```ts
import { setupGo } from '../typed-gha-actions/actions-setup-go.js'

// usage is identical to a built-in wrapper
setupGo({ with: { 'go-version': '1.23' } })
```

## Comparison with related projects

| Project | API | Typed action wrappers |
| --- | --- | --- |
| `typed-gha` (this) | functional — plain values, no classes | 11 curated; `action.yml` codegen planned (ADR-0002) |
| [github-actions-workflow-ts](https://github.com/emmanuelnk/github-actions-workflow-ts) | class-based (`Workflow`, `NormalJob`, `Step`) | yes — typed class wrappers for popular actions |
| [github-actions-wac](https://github.com/webiny/github-actions-wac) | functional (`createWorkflow`) | no — plain objects with standard `uses`/`with` syntax |

## Requirements

- **`@typed-gha/cli`**: Node ≥ 22 (uses `node:fs/promises` glob API introduced in Node 22).
- **`@typed-gha/core`**: Node ≥ 20 (no Node 22 APIs in core; safe as a pure library dependency).
- Compatible with pnpm, npm, and yarn workspaces.

## Status & roadmap

**Phase 1 (shipped)** — functional API, 11 handwritten typed wrappers, `gha build`
CLI with `--check` mode.

**Phase 1.5 (shipped)** — publishable packages: `tsc` compile pipeline,
node shebang on the CLI bin, TSDoc on all public API surfaces.

**Phase 2 (shipped)** — `gha add <owner/repo@ref>` generates a typed wrapper
from any action's `action.yml`, using the same `makeAction` factory shape as
the handwritten set. Workflow code written against Phase 1 wrappers keeps
working unchanged.

**Phase 3 (next)** — typed step outputs across `needs()` / `stepOutput()`
helpers, enabled by the `const` type-parameter preservation landed in Phase 1.

## Links

- [ADR index](docs/adr/) — architecture decision records
  - [ADR-0001: Functional API over builder pattern](docs/adr/0001-functional-api-over-builder-pattern.md)
  - [ADR-0002: Handwritten action types for Phase 1](docs/adr/0002-handwritten-action-types-phase1.md)
- [MIT License](LICENSE)
