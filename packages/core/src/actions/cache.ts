import { makeAction } from './_factory.js'

/**
 * Inputs for `actions/cache@v4`.
 *
 * @see https://github.com/actions/cache
 */
export type CacheInputs = {
  /** Required by the action, but typed optional: TS cannot enforce required-ness inside `with`. */
  path?: string
  /** Required by the action; see `path`. The cache key used to identify and restore the cache. */
  key?: string
  /** Ordered list of keys to use as fallbacks when an exact match for `key` is not found. */
  'restore-keys'?: string | readonly string[]
  /** Chunk size in bytes for uploading to the cache. */
  'upload-chunk-size'?: number | string
  /** Whether to allow caching on Windows runners to be restored on non-Windows runners and vice versa. */
  enableCrossOsArchive?: boolean | string
  /** Whether to fail the step if no cache was found for the primary `key`. */
  'fail-on-cache-miss'?: boolean | string
  /** If `true`, only checks whether a cache entry exists and skips downloading it. */
  'lookup-only'?: boolean | string
  /** Whether to save the cache even if a subsequent step fails. */
  'save-always'?: boolean | string
}

/**
 * Outputs produced by `actions/cache@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/cache#outputs
 */
export type CacheOutputs = {
  'cache-hit': string
  'cache-primary-key': string
  'cache-matched-key': string
}

/**
 * Returns a `UsesStep` for `actions/cache@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   cache({
 *     with: {
 *       path: '~/.pnpm-store',
 *       key: `\${{ runner.os }}-pnpm-\${{ hashFiles('pnpm-lock.yaml') }}`,
 *     },
 *   }),
 * ]
 * ```
 */
export const cache = makeAction<'actions/cache@v4', CacheInputs, CacheOutputs>('actions/cache@v4')
