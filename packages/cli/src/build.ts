import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { emitYaml, type Workflow } from '@typed-gha/core'
import { findWorkflows } from './discover.js'

type BuildOne = { source: string; output: string; yaml: string }

/**
 * Result returned by `runBuild`.
 *
 * - `built` — every workflow compiled during this run (present in both write and check modes).
 * - `written` — paths written to disk; populated only in write mode (`check: false`).
 * - `drift` — paths whose on-disk content differs from the generated YAML; populated only in
 *   check mode (`check: true`). Non-empty means a committed `.yml` is out of sync.
 */
export type BuildResult = {
  built: readonly BuildOne[]
  written: readonly string[]
  drift: readonly string[]
}

/** tsx `tsImport` may wrap an ESM `export default X` as
 *  `{ default: { __esModule: true, default: X } }` (esbuild CJS-interop artifact) on some
 *  platforms. We unwrap when we see the `__esModule: true` marker; otherwise `mod.default`
 *  is the value directly. The earlier heuristic that keyed off `'module.exports' in mod`
 *  was fragile — that key isn't always present on Linux/CI even when the inner __esModule
 *  wrap exists. We additionally require the unwrapped value to have a `jobs` field, which
 *  catches CJS-wrapped namespaces that have no default export (the named-only-export shape
 *  `{ x: {} }` is structurally indistinguishable from a real workflow object otherwise). */
type TsxMod = { default?: unknown }

const loadWorkflow = async (file: string): Promise<Workflow> => {
  const mod = (await tsImport(pathToFileURL(file).href, import.meta.url)) as TsxMod
  let value: unknown = mod.default
  if (
    value !== null &&
    typeof value === 'object' &&
    '__esModule' in value &&
    (value as { __esModule?: unknown }).__esModule === true
  ) {
    value = (value as { default?: unknown }).default
  }
  if (value === null || value === undefined || typeof value !== 'object' || !('jobs' in value)) {
    throw new Error(`${file}: missing default export of a Workflow object`)
  }
  return value as Workflow
}

const buildOne = async (file: string): Promise<BuildOne> => {
  const workflow = await loadWorkflow(file)
  const outName = basename(file).replace(/\.workflow\.ts$/, '.yml')
  return { source: file, output: resolve(dirname(file), outName), yaml: emitYaml(workflow) }
}

/**
 * Compiles all `*.workflow.ts` files found under `opts.cwd` to YAML.
 *
 * @remarks
 * In **write mode** (`check: false`), each generated YAML string is written to the `.yml` file
 * adjacent to its source. In **check mode** (`check: true`), no files are written — instead,
 * the on-disk content is compared against the generated output and diverging paths are
 * collected in `BuildResult.drift`.
 *
 * `runBuild` is side-effect-free beyond file I/O (no stdout/stderr output). Callers are
 * responsible for all user-facing reporting based on the returned `BuildResult`.
 *
 * @param opts - Build options.
 * @param opts.cwd - Root directory to search for workflow source files.
 * @param opts.check - If `true`, compare generated YAML against existing files instead of writing.
 * @returns A `BuildResult` describing what was compiled, written, and (in check mode) drifted.
 */
export const runBuild = async (opts: { cwd: string; check: boolean }): Promise<BuildResult> => {
  const files = await findWorkflows(opts.cwd)
  const built: BuildOne[] = []
  const written: string[] = []
  const drift: string[] = []
  for (const file of files) {
    const one = await buildOne(file)
    built.push(one)
    if (opts.check) {
      const existing = await readFile(one.output, 'utf8').catch(() => '')
      if (existing !== one.yaml) drift.push(one.output)
    } else {
      await writeFile(one.output, one.yaml)
      written.push(one.output)
    }
  }
  return { built, written, drift }
}
