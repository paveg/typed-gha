import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { emitYaml, type Workflow } from '@typed-gha/core'
import { findWorkflows } from './discover.ts'

type BuildOne = { source: string; output: string; yaml: string }
export type BuildResult = {
  built: readonly BuildOne[]
  written: readonly string[]
  drift: readonly string[]
}

/** tsx `tsImport` has two loading modes depending on whether the loaded file is treated as CJS or ESM:
 *  - CJS context (no surrounding "type":"module" package.json): esbuild interop wraps exports as
 *    `{ default: { __esModule: true, default: X }, "module.exports": {...} }`. The `module.exports`
 *    key is present and `__esModule: true` marks a real default export.
 *  - ESM context (inside a "type":"module" package): native ESM — `mod` has only a `default` key.
 *    `export default X` → `mod.default = X`; no default export → `mod.default = undefined`.
 *  Strategy: if the outer `mod` contains a `module.exports` key it's CJS-loaded; require
 *  `__esModule: true` to confirm a real default export. Otherwise use `mod.default` directly. */
type TsxMod = { default?: { __esModule?: boolean; default?: unknown } | unknown; 'module.exports'?: unknown }

const loadWorkflow = async (file: string): Promise<Workflow> => {
  const mod = (await tsImport(pathToFileURL(file).href, import.meta.url)) as TsxMod
  const isCjs = 'module.exports' in mod
  const wrapper = mod.default
  const value = isCjs
    ? wrapper !== null && typeof wrapper === 'object' && (wrapper as { __esModule?: boolean }).__esModule === true
      ? (wrapper as { __esModule: boolean; default?: unknown }).default
      : undefined
    : wrapper
  if (value === null || value === undefined || typeof value !== 'object') {
    throw new Error(`${file}: missing default export of a Workflow object`)
  }
  return value as Workflow
}

const buildOne = async (file: string): Promise<BuildOne> => {
  const workflow = await loadWorkflow(file)
  const outName = basename(file).replace(/\.workflow\.ts$/, '.yml')
  return { source: file, output: resolve(dirname(file), outName), yaml: emitYaml(workflow) }
}

export const runBuild = async (opts: {
  cwd: string
  check: boolean
}): Promise<BuildResult> => {
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
