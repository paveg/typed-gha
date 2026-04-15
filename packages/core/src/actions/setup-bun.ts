import { makeAction } from './_factory.ts'

export type SetupBunInputs = {
  'bun-version'?: string
  'bun-version-file'?: string
  'bun-download-url'?: string
  'registry-url'?: string
  scope?: string
  'no-cache'?: boolean | string
}

export type SetupBunOutputs = {
  'bun-version': string
  'cache-hit': string
}

export const setupBun = makeAction<'oven-sh/setup-bun@v2', SetupBunInputs, SetupBunOutputs>(
  'oven-sh/setup-bun@v2',
)
