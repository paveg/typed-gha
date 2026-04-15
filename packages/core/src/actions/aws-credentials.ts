import { makeAction } from './_factory.ts'

export type AwsCredentialsInputs = {
  'role-to-assume'?: string
  'aws-region'?: string
  'aws-access-key-id'?: string
  'aws-secret-access-key'?: string
  'aws-session-token'?: string
  'web-identity-token-file'?: string
  'role-chaining'?: boolean | string
  audience?: string
  'http-proxy'?: string
  'mask-aws-account-id'?: boolean | string
  'role-skip-session-tagging'?: boolean | string
  'role-external-id'?: string
  'role-duration-seconds'?: number | string
  'role-session-name'?: string
  'output-credentials'?: boolean | string
  'unset-current-credentials'?: boolean | string
  'disable-retry'?: boolean | string
  'retry-max-attempts'?: number | string
}

export type AwsCredentialsOutputs = {
  'aws-account-id': string
}

export const awsCredentials = makeAction<'aws-actions/configure-aws-credentials@v4', AwsCredentialsInputs, AwsCredentialsOutputs>(
  'aws-actions/configure-aws-credentials@v4',
)
