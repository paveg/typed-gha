import { makeAction } from './_factory.ts'

/**
 * Inputs for `actions/checkout@v4`.
 *
 * @see https://github.com/actions/checkout
 */
export type CheckoutInputs = {
  /** Repository to check out, in `owner/repo` format. Defaults to the repository that triggered the workflow. */
  repository?: string
  /** Branch, tag, or SHA to check out. Defaults to the SHA that triggered the workflow. */
  ref?: string
  /** Personal access token or app token used to authenticate. Defaults to `${{ github.token }}`. */
  token?: string
  'ssh-key'?: string
  'ssh-known-hosts'?: string
  'ssh-strict'?: boolean | string
  /** Whether to configure git credentials so subsequent git commands can push. */
  'persist-credentials'?: boolean | string
  /** Relative path under `$GITHUB_WORKSPACE` to place the repository. */
  path?: string
  /** Whether to execute `git clean -ffdx && git reset --hard HEAD` before fetching. */
  clean?: boolean | string
  /**
   * Number of commits to fetch. `0` fetches the full history (required for `git log`, changelogs,
   * or tools that walk commit history). Defaults to `1` (shallow clone).
   */
  'fetch-depth'?: number | string
  /** Whether to fetch tags, even when `fetch-depth` is greater than zero. */
  'fetch-tags'?: boolean | string
  'show-progress'?: boolean | string
  /** Whether to download Git LFS files. Requires Git LFS to be installed on the runner. */
  lfs?: boolean | string
  /** Whether to check out submodules. `'recursive'` initializes nested submodules. */
  submodules?: boolean | 'recursive' | string
  'set-safe-directory'?: boolean | string
  'github-server-url'?: string
}

/**
 * Outputs produced by `actions/checkout@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/checkout#outputs
 */
export type CheckoutOutputs = {
  ref: string
  commit: string
}

/**
 * Returns a `UsesStep` for `actions/checkout@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   checkout({ with: { 'fetch-depth': 0 } }),
 * ]
 * ```
 */
export const checkout = makeAction<'actions/checkout@v4', CheckoutInputs, CheckoutOutputs>(
  'actions/checkout@v4',
)
