import { makeAction } from './_factory.ts'

export type SetupPnpmRunInstallEntry = {
  recursive?: boolean
  cwd?: string
  args?: readonly string[]
}

export type SetupPnpmInputs = {
  version?: string | number
  dest?: string
  /** Accepts boolean, a JSON string (e.g. YAML `|` block emitting JSON), or
   *  a structured entry/array. The `unknown` third arm in earlier drafts
   *  collapsed the whole union to `unknown`; this shape keeps narrowing. */
  run_install?: boolean | string | SetupPnpmRunInstallEntry | readonly SetupPnpmRunInstallEntry[]
}

export type SetupPnpmOutputs = Record<string, never>

export const setupPnpm = makeAction<'pnpm/action-setup@v4', SetupPnpmInputs, SetupPnpmOutputs>(
  'pnpm/action-setup@v4',
)
