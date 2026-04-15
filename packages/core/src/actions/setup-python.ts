import { makeAction } from './_factory.ts'

/**
 * Inputs for `actions/setup-python@v5`.
 *
 * @see https://github.com/actions/setup-python
 */
export type SetupPythonInputs = {
  /** Python version spec or range (e.g., `'3.11'`, `'>=3.10'`). Accepts an array for matrix builds. */
  'python-version'?: string | readonly string[]
  /** Path to a file containing a Python version spec (e.g., `.python-version`). */
  'python-version-file'?: string
  /**
   * Package manager to use for caching dependencies.
   *
   * Narrowed beyond upstream docs; unknown values are compile errors. The action only
   * recognises `'pip'`, `'pipenv'`, and `'poetry'`.
   */
  cache?: 'pip' | 'pipenv' | 'poetry'
  architecture?: string
  /** Whether to check for and use the latest available version matching the spec. */
  'check-latest'?: boolean | string
  token?: string
  'cache-dependency-path'?: string
  /** Whether to update environment variables (`PATH`, `pythonLocation`, etc.) for subsequent steps. */
  'update-environment'?: boolean | string
  'allow-prereleases'?: boolean | string
}

/**
 * Outputs produced by `actions/setup-python@v5`.
 *
 * Outputs are phantom at Phase 1 — type information only, not consumed at runtime yet.
 *
 * @see https://github.com/actions/setup-python#outputs
 */
export type SetupPythonOutputs = {
  'python-version': string
  'cache-hit': string
  'python-path': string
}

/**
 * Returns a `UsesStep` for `actions/setup-python@v5`.
 *
 * @example
 * ```ts
 * steps: [
 *   setupPython({ with: { 'python-version': '3.11', cache: 'pip' } }),
 * ]
 * ```
 */
export const setupPython = makeAction<'actions/setup-python@v5', SetupPythonInputs, SetupPythonOutputs>(
  'actions/setup-python@v5',
)
