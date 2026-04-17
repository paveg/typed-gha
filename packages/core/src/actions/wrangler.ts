import { makeAction } from './_factory.js'

/**
 * Inputs for `cloudflare/wrangler-action@v3`.
 *
 * @see https://github.com/cloudflare/wrangler-action
 */
export type WranglerInputs = {
  /** Cloudflare API token with Workers/Pages permissions. */
  apiToken?: string
  /** Cloudflare account ID. Required for most deploy targets. */
  accountId?: string
  /** Directory to run Wrangler commands from. */
  workingDirectory?: string
  /** Wrangler CLI version to install (e.g., `'3'`, `'latest'`). */
  wranglerVersion?: string
  /**
   * Package manager used to install Wrangler.
   *
   * Narrowed beyond upstream docs; unknown values are compile errors. The action only
   * recognises `'npm'`, `'yarn'`, `'pnpm'`, and `'bun'`.
   */
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  /** Shell commands to run before the main `command`. */
  preCommands?: string
  /** Wrangler command to run (e.g., `'deploy'`, `'pages deploy ./dist'`). */
  command?: string
  /** Wrangler environment to target (maps to `[env.NAME]` in `wrangler.toml`). */
  environment?: string
  /** Newline-separated secret names to bind from the runner environment. */
  secrets?: string
  /** Newline-separated `KEY=VALUE` pairs to set as Wrangler vars. */
  vars?: string
}

/**
 * Outputs produced by `cloudflare/wrangler-action@v3`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/cloudflare/wrangler-action#outputs
 */
export type WranglerOutputs = {
  'command-output': string
  'deployment-url': string
  'pages-deployment-alias-url': string
}

/**
 * Returns a `UsesStep` for `cloudflare/wrangler-action@v3`.
 *
 * @example
 * ```ts
 * steps: [
 *   wrangler({
 *     with: {
 *       apiToken: secret('CLOUDFLARE_API_TOKEN'),
 *       accountId: secret('CLOUDFLARE_ACCOUNT_ID'),
 *       command: 'deploy',
 *     },
 *   }),
 * ]
 * ```
 */
export const wrangler = makeAction<
  'cloudflare/wrangler-action@v3',
  WranglerInputs,
  WranglerOutputs
>('cloudflare/wrangler-action@v3')
