import { makeAction } from './_factory.js'

/**
 * Inputs for `oven-sh/setup-bun@v2`.
 *
 * @see https://github.com/oven-sh/setup-bun
 */
export type SetupBunInputs = {
  /** Bun version to install (e.g., `'1'`, `'latest'`, `'canary'`). */
  'bun-version'?: string
  /** Path to a file containing a Bun version spec (e.g., `.bun-version`). */
  'bun-version-file'?: string
  /** Direct download URL to a Bun release archive, overriding version resolution. */
  'bun-download-url'?: string
  /** npm registry base URL for scoped package authentication. */
  'registry-url'?: string
  scope?: string
  /** Whether to skip the GitHub Actions tool cache entirely and always re-download. */
  'no-cache'?: boolean | string
}

/**
 * Outputs produced by `oven-sh/setup-bun@v2`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/oven-sh/setup-bun#outputs
 */
export type SetupBunOutputs = {
  'bun-version': string
  'cache-hit': string
}

/**
 * Returns a `UsesStep` for `oven-sh/setup-bun@v2`.
 *
 * @example
 * ```ts
 * steps: [
 *   setupBun({ with: { 'bun-version': '1' } }),
 * ]
 * ```
 */
export const setupBun = makeAction<'oven-sh/setup-bun@v2', SetupBunInputs, SetupBunOutputs>(
  'oven-sh/setup-bun@v2',
)
