import { makeAction } from './_factory.ts'

export type CacheInputs = {
  /** Required by the action, but typed optional: TS cannot enforce required-ness inside `with`. */
  path?: string
  /** Required by the action; see `path`. */
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
