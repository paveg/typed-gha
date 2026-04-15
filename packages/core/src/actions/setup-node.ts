import { makeAction } from './_factory.js'

/**
 * Inputs for `actions/setup-node@v4`.
 *
 * @see https://github.com/actions/setup-node
 */
export type SetupNodeInputs = {
  /** Semantic version spec or range (e.g., `'20'`, `'>=18'`). Resolved via node-versions dist. */
  'node-version'?: string
  /** Path to a file containing a Node.js version spec (e.g., `.node-version`, `.nvmrc`). */
  'node-version-file'?: string
  architecture?: string
  /** Whether to check for and use the latest available version matching the spec. */
  'check-latest'?: boolean | string
  /** npm registry base URL for scoped package authentication. */
  'registry-url'?: string
  scope?: string
  'always-auth'?: boolean | string
  token?: string
  /**
   * Package manager to use for caching dependencies.
   *
   * Narrowed beyond upstream docs; unknown values are compile errors. The action only
   * recognises `'npm'`, `'yarn'`, and `'pnpm'`.
   */
  cache?: 'npm' | 'yarn' | 'pnpm'
  'cache-dependency-path'?: string
}

/**
 * Outputs produced by `actions/setup-node@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/setup-node#outputs
 */
export type SetupNodeOutputs = {
  'node-version': string
  'cache-hit': string
}

/**
 * Returns a `UsesStep` for `actions/setup-node@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   setupNode({ with: { 'node-version': '20', cache: 'pnpm' } }),
 * ]
 * ```
 */
export const setupNode = makeAction<'actions/setup-node@v4', SetupNodeInputs, SetupNodeOutputs>(
  'actions/setup-node@v4',
)
