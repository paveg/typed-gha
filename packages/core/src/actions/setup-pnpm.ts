import { makeAction } from './_factory.ts'

export type SetupPnpmInputs = {
  version?: string | number
  dest?: string
  /** Boolean short-hand, a JSON-stringified config, or one/many structured entries. */
  run_install?:
    | boolean
    | string
    | { recursive?: boolean; cwd?: string; args?: readonly string[] }
    | readonly { recursive?: boolean; cwd?: string; args?: readonly string[] }[]
}

export type SetupPnpmOutputs = Record<string, never>

export const setupPnpm = makeAction<'pnpm/action-setup@v4', SetupPnpmInputs, SetupPnpmOutputs>(
  'pnpm/action-setup@v4',
)
