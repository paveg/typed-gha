import { makeAction } from './_factory.ts'

export type SetupPythonInputs = {
  'python-version'?: string | readonly string[]
  'python-version-file'?: string
  // Narrowed beyond upstream docs: the action only recognises these three package managers
  cache?: 'pip' | 'pipenv' | 'poetry'
  architecture?: string
  'check-latest'?: boolean | string
  token?: string
  'cache-dependency-path'?: string
  'update-environment'?: boolean | string
  'allow-prereleases'?: boolean | string
}

export type SetupPythonOutputs = {
  'python-version': string
  'cache-hit': string
  'python-path': string
}

export const setupPython = makeAction<'actions/setup-python@v5', SetupPythonInputs, SetupPythonOutputs>(
  'actions/setup-python@v5',
)
