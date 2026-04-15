import { makeAction } from './_factory.ts'

/**
 * Inputs for `pnpm/action-setup@v4`.
 *
 * @see https://github.com/pnpm/action-setup
 */
export type SetupPnpmInputs = {
  /** pnpm version to install. Defaults to the version in `packageManager` field of `package.json`. */
  version?: string | number
  /** Directory to install pnpm into. Defaults to a well-known location in the tool cache. */
  dest?: string
  /** Boolean short-hand, a JSON-stringified config, or one/many structured entries. */
  run_install?:
    | boolean
    | string
    | { recursive?: boolean; cwd?: string; args?: readonly string[] }
    | readonly { recursive?: boolean; cwd?: string; args?: readonly string[] }[]
}

/**
 * Outputs produced by `pnpm/action-setup@v4`.
 *
 * This action declares no outputs. Outputs are phantom at Phase 1 — type information only,
 * not consumed at runtime yet.
 *
 * @see https://github.com/pnpm/action-setup
 */
export type SetupPnpmOutputs = Record<string, never>

/**
 * Returns a `UsesStep` for `pnpm/action-setup@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   setupPnpm({ with: { version: '9' } }),
 *   setupNode({ with: { 'node-version': '20', cache: 'pnpm' } }),
 * ]
 * ```
 */
export const setupPnpm = makeAction<'pnpm/action-setup@v4', SetupPnpmInputs, SetupPnpmOutputs>(
  'pnpm/action-setup@v4',
)
