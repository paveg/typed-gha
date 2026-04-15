import { makeAction } from './_factory.ts'

export type CheckoutInputs = {
  repository?: string
  ref?: string
  token?: string
  'ssh-key'?: string
  'ssh-known-hosts'?: string
  'ssh-strict'?: boolean | string
  'persist-credentials'?: boolean | string
  path?: string
  clean?: boolean | string
  'fetch-depth'?: number | string
  'fetch-tags'?: boolean | string
  'show-progress'?: boolean | string
  lfs?: boolean | string
  submodules?: boolean | 'recursive' | string
  'set-safe-directory'?: boolean | string
  'github-server-url'?: string
}

export type CheckoutOutputs = {
  ref: string
  commit: string
}

export const checkout = makeAction<'actions/checkout@v4', CheckoutInputs, CheckoutOutputs>(
  'actions/checkout@v4',
)
