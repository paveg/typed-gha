import { makeAction } from './_factory.js'

/**
 * Inputs for `actions/setup-go@v5`.
 *
 * @see https://github.com/actions/setup-go
 */
export type SetupGoInputs = {
  /** Semantic version spec or range (e.g., `'1.21'`, `'^1.22'`). */
  'go-version'?: string
  /** Path to a file containing a Go version spec (e.g., `go.mod`, `.go-version`). */
  'go-version-file'?: string
  /** Whether to check for and use the latest available version matching the spec. */
  'check-latest'?: boolean | string
  token?: string
  /** Whether to enable module caching. Caches the Go module cache using the `go.sum` file as key. */
  cache?: boolean | string
  'cache-dependency-path'?: string
  architecture?: string
}

/**
 * Outputs produced by `actions/setup-go@v5`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/setup-go#outputs
 */
export type SetupGoOutputs = {
  'go-version': string
  'cache-hit': string
}

/**
 * Returns a `UsesStep` for `actions/setup-go@v5`.
 *
 * @example
 * ```ts
 * steps: [
 *   setupGo({ with: { 'go-version': '1.22', cache: true } }),
 * ]
 * ```
 */
export const setupGo = makeAction<'actions/setup-go@v5', SetupGoInputs, SetupGoOutputs>(
  'actions/setup-go@v5',
)
