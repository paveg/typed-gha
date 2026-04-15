import { makeAction } from './_factory.js'

/**
 * Inputs for `aws-actions/configure-aws-credentials@v4`.
 *
 * @see https://github.com/aws-actions/configure-aws-credentials
 */
export type AwsCredentialsInputs = {
  /** IAM role ARN to assume via OIDC or STS. Use instead of long-lived access keys when possible. */
  'role-to-assume'?: string
  /** AWS region (e.g., `'us-east-1'`). Required for most SDK operations. */
  'aws-region'?: string
  /** AWS access key ID. Prefer OIDC (`role-to-assume`) over long-lived keys. */
  'aws-access-key-id'?: string
  /** AWS secret access key corresponding to `aws-access-key-id`. */
  'aws-secret-access-key'?: string
  /** Session token for temporary credentials. */
  'aws-session-token'?: string
  /** Path to a web identity token file for OIDC federation outside of GitHub Actions. */
  'web-identity-token-file'?: string
  /** Whether to chain role assumption with existing credentials in the environment. */
  'role-chaining'?: boolean | string
  /** OIDC token audience. Defaults to `sts.amazonaws.com`. */
  audience?: string
  'http-proxy'?: string
  /** Whether to mask the AWS account ID in logs. */
  'mask-aws-account-id'?: boolean | string
  'role-skip-session-tagging'?: boolean | string
  /** External ID for the role assumption, when required by the role's trust policy. */
  'role-external-id'?: string
  /** Duration in seconds for the assumed role session. Defaults to 3600. */
  'role-duration-seconds'?: number | string
  /** Name for the assumed role session. Defaults to `GitHubActions`. */
  'role-session-name'?: string
  /** Whether to export the assumed credentials as step outputs. */
  'output-credentials'?: boolean | string
  /** Whether to unset any existing AWS credential environment variables before setting new ones. */
  'unset-current-credentials'?: boolean | string
  'disable-retry'?: boolean | string
  'retry-max-attempts'?: number | string
}

/**
 * Outputs produced by `aws-actions/configure-aws-credentials@v4`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/aws-actions/configure-aws-credentials#outputs
 */
export type AwsCredentialsOutputs = {
  'aws-account-id': string
}

/**
 * Returns a `UsesStep` for `aws-actions/configure-aws-credentials@v4`.
 *
 * @example
 * ```ts
 * steps: [
 *   awsCredentials({
 *     with: {
 *       'role-to-assume': secret('AWS_ROLE_ARN'),
 *       'aws-region': 'us-east-1',
 *     },
 *   }),
 * ]
 * ```
 */
export const awsCredentials = makeAction<'aws-actions/configure-aws-credentials@v4', AwsCredentialsInputs, AwsCredentialsOutputs>(
  'aws-actions/configure-aws-credentials@v4',
)
