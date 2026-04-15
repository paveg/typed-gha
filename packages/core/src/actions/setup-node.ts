import { makeAction } from './_factory.ts'

export type SetupNodeInputs = {
  'node-version'?: string
  'node-version-file'?: string
  architecture?: string
  'check-latest'?: boolean | string
  'registry-url'?: string
  scope?: string
  'always-auth'?: boolean | string
  token?: string
  // Narrowed beyond upstream docs: the action only recognises these three values
  cache?: 'npm' | 'yarn' | 'pnpm'
  'cache-dependency-path'?: string
}

export type SetupNodeOutputs = {
  'node-version': string
  'cache-hit': string
}

export const setupNode = makeAction<'actions/setup-node@v4', SetupNodeInputs, SetupNodeOutputs>(
  'actions/setup-node@v4',
)
