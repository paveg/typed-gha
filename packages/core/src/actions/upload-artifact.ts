import { makeAction } from './_factory.ts'

/**
 * Inputs for `actions/upload-artifact@v4`.
 *
 * @see https://github.com/actions/upload-artifact
 */
export type UploadArtifactInputs = {
  /** Artifact name. Defaults to `'artifact'`. */
  name?: string
  /** File, directory, or glob pattern of files to include in the artifact. */
  path?: string
  /**
   * Behavior when no files are found matching `path`.
   *
   * Narrowed beyond upstream docs; unknown values are compile errors. The action only
   * recognises `'warn'` (default), `'error'` (fail the step), and `'ignore'` (silently skip).
   */
  'if-no-files-found'?: 'warn' | 'error' | 'ignore'
  /** Number of days to retain the artifact. Defaults to the repository's retention setting. */
  'retention-days'?: number | string
  /** zlib compression level (0–9). `0` disables compression; useful for already-compressed files. */
  'compression-level'?: number | string
  /** Whether to overwrite an existing artifact with the same name in this workflow run. */
  overwrite?: boolean | string
  /** Whether to include hidden files (names starting with `.`) in the upload. */
  'include-hidden-files'?: boolean | string
}

/**
 * Outputs produced by `actions/upload-artifact@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/upload-artifact#outputs
 */
export type UploadArtifactOutputs = {
  'artifact-id': string
  'artifact-url': string
  'artifact-digest': string
}

/**
 * Returns a `UsesStep` for `actions/upload-artifact@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   uploadArtifact({ with: { name: 'dist', path: 'dist/', 'if-no-files-found': 'error' } }),
 * ]
 * ```
 */
export const uploadArtifact = makeAction<'actions/upload-artifact@v4', UploadArtifactInputs, UploadArtifactOutputs>(
  'actions/upload-artifact@v4',
)
