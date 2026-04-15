import { makeAction } from './_factory.ts'

export type CacheInputs = {
  /**
   * An explicit list of files, directories, and wildcard patterns to cache and restore.
   * Required in practice but typed optional since TypeScript cannot enforce required-ness inside `with`.
   */
  path?: string
  /** Primary cache key. Required in practice — see `path` note above. */
  key?: string
  'restore-keys'?: string | readonly string[]
  'upload-chunk-size'?: number | string
  enableCrossOsArchive?: boolean | string
  'fail-on-cache-miss'?: boolean | string
  'lookup-only'?: boolean | string
  'save-always'?: boolean | string
}

export type CacheOutputs = {
  'cache-hit': string
  'cache-primary-key': string
  'cache-matched-key': string
}

export const cache = makeAction<'actions/cache@v4', CacheInputs, CacheOutputs>(
  'actions/cache@v4',
)
