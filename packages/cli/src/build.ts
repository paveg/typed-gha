import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { emitYaml, type Workflow } from '@typed-gha/core'
import { findWorkflows } from './discover.ts'

export type BuildOne = { source: string; output: string; yaml: string }
export type BuildResult = {
  built: readonly BuildOne[]
  written: readonly string[]
  drift: readonly string[]
}

/** tsx 4.x `tsImport` wraps an ESM `export default X` as
 *  `{ default: { __esModule: true, default: X } }` — an esbuild CJS-interop artifact,
 *  NOT standard ESM. Native `import()` returns `{ default: X }` directly. We deliberately
 *  require the `__esModule: true` marker so a fixture like `export const x = {}` (no
 *  default export at all) is rejected rather than silently treated as a workflow.
 *  Revisit if the loader ever changes (native import, Node `--experimental-strip-types`,
 *  jiti, etc.) — workflow files would silently load as `undefined`. */
type TsxMod = { default?: { __esModule?: boolean; default?: unknown } }

const loadWorkflow = async (file: string): Promise<Workflow> => {
  const mod = (await tsImport(pathToFileURL(file).href, import.meta.url)) as TsxMod
  const wrapper = mod.default
  const value = wrapper?.__esModule === true ? wrapper.default : undefined
  if (value === null || value === undefined || typeof value !== 'object') {
    throw new Error(`${file}: missing default export of a Workflow object`)
  }
  return value as Workflow
}

export const buildOne = async (file: string): Promise<BuildOne> => {
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
  for (const p of written) process.stdout.write(`wrote: ${p}\n`)
  for (const p of drift) process.stderr.write(`drift: ${p}\n`)
  return { built, written, drift }
}
