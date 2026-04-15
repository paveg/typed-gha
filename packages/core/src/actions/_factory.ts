import type { UsesStep } from '../types.js'

type StepBase<Id extends string> = {
  id?: Id
  name?: string
  if?: string
  env?: Record<string, string | number | boolean>
  'continue-on-error'?: boolean | string
  'timeout-minutes'?: number
  'working-directory'?: string
}

export const makeAction =
  <Ref extends string, Inputs, Outputs extends Record<string, string>>(ref: Ref) =>
  <Id extends string = string>(
    args?: StepBase<Id> & { with?: Inputs },
  ): UsesStep<Ref, Id, Outputs> => {
    const { with: withArg, ...rest } = args ?? {}
    return {
      uses: ref,
      ...rest,
      ...(withArg !== undefined ? { with: withArg as Record<string, string | number | boolean> } : {}),
    } as UsesStep<Ref, Id, Outputs>
  }
