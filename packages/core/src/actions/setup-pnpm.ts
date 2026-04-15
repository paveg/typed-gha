import { makeAction } from './_factory.ts'

export type SetupPnpmInputs = {
  version?: string | number
  dest?: string
  // run_install can be a boolean, a JSON string, or a full install config object
  run_install?: boolean | string | unknown
}

export type SetupPnpmOutputs = Record<string, never>

export const setupPnpm = makeAction<'pnpm/action-setup@v4', SetupPnpmInputs, SetupPnpmOutputs>(
  'pnpm/action-setup@v4',
)
