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

type TsxMod = { default?: { __esModule?: boolean; default?: unknown } }

const loadWorkflow = async (file: string): Promise<Workflow> => {
  // tsx wraps ESM modules: real default is at mod.default.default when __esModule is true
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
