import { makeAction } from './_factory.ts'

/**
 * Inputs for `actions/download-artifact@v4`.
 *
 * @see https://github.com/actions/download-artifact
 */
export type DownloadArtifactInputs = {
  /** Name of the artifact to download. If omitted, all artifacts for the run are downloaded. */
  name?: string
  /** Destination directory. Defaults to `$GITHUB_WORKSPACE`. */
  path?: string
  /** Glob pattern to match artifact names when downloading multiple artifacts. */
  pattern?: string
  /** Whether to merge contents of multiple matched artifacts into a single directory. */
  'merge-multiple'?: boolean | string
  /** Token for downloading artifacts from a different repository or workflow run. */
  'github-token'?: string
  /** Source repository in `owner/repo` format. Defaults to the current repository. */
  repository?: string
  /** Workflow run ID to download artifacts from. Defaults to the current run. */
  'run-id'?: string | number
  /** Comma-separated list of artifact IDs to download. */
  'artifact-ids'?: string
}

/**
 * Outputs produced by `actions/download-artifact@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/download-artifact#outputs
 */
export type DownloadArtifactOutputs = {
  'download-path': string
}

/**
 * Returns a `UsesStep` for `actions/download-artifact@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   downloadArtifact({ with: { name: 'dist', path: './dist' } }),
 * ]
 * ```
 */
export const downloadArtifact = makeAction<'actions/download-artifact@v4', DownloadArtifactInputs, DownloadArtifactOutputs>(
  'actions/download-artifact@v4',
)
