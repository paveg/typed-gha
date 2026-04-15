import { makeAction } from './_factory.ts'

export type SetupGoInputs = {
  'go-version'?: string
  'go-version-file'?: string
  'check-latest'?: boolean | string
  token?: string
  cache?: boolean | string
  'cache-dependency-path'?: string
  architecture?: string
}

export type SetupGoOutputs = {
  'go-version': string
  'cache-hit': string
}

export const setupGo = makeAction<'actions/setup-go@v5', SetupGoInputs, SetupGoOutputs>(
  'actions/setup-go@v5',
)
