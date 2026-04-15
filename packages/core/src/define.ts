import type { Workflow } from './types.ts'

/**
 * Identity function that pins a `Workflow` literal at the call site.
 *
 * The `const` type parameter preserves literal types for all fields — essential for
 * future outputs-inference across `needs()` and `stepOutput()` helpers. Without it,
 * TypeScript widens string literals to `string`, losing the information needed to
 * cross-reference job/step ids.
 *
 * @param workflow - The workflow definition.
 * @returns The same object, with its type narrowed to the literal input shape.
 * @example
 * ```ts
 * export default defineWorkflow({
 *   on: 'push',
 *   jobs: {
 *     build: {
 *       'runs-on': 'ubuntu-latest',
 *       steps: [checkout()],
 *     },
 *   },
 * })
 * ```
 */
export const defineWorkflow = <const T extends Workflow>(workflow: T): T => workflow

/**
 * Returns the `${{ secrets.NAME }}` expression string for a GitHub Actions secret.
 *
 * @param name - The secret name as configured in the repository or environment settings.
 * @returns A GitHub Actions expression string that resolves to the secret value at runtime.
 * @example
 * ```ts
 * steps: [
 *   { run: 'npm publish', env: { NODE_AUTH_TOKEN: secret('NPM_TOKEN') } },
 * ]
 * ```
 */
export const secret = (name: string): string => `\${{ secrets.${name} }}`

/**
 * Returns the `${{ vars.NAME }}` expression string for a GitHub Actions variable.
 *
 * Variables (unlike secrets) are visible in workflow logs. Use them for non-sensitive
 * configuration that needs to vary per environment or repository.
 *
 * @param name - The variable name as configured in the repository or environment settings.
 * @returns A GitHub Actions expression string that resolves to the variable value at runtime.
 * @example
 * ```ts
 * steps: [
 *   { run: 'echo $DEPLOY_ENV', env: { DEPLOY_ENV: variable('DEPLOY_ENV') } },
 * ]
 * ```
 */
export const variable = (name: string): string => `\${{ vars.${name} }}`

/**
 * Returns the `${{ env.NAME }}` expression string for a workflow environment variable.
 *
 * Useful for referencing a variable set at workflow or job level from within an expression
 * context (e.g., `if:` conditions), where bare `$NAME` shell syntax is not available.
 *
 * @param name - The environment variable name.
 * @returns A GitHub Actions expression string that resolves to the env var value at runtime.
 * @example
 * ```ts
 * steps: [
 *   { run: 'echo hello', if: `${env('MY_FLAG')} == 'true'` },
 * ]
 * ```
 */
export const env = (name: string): string => `\${{ env.${name} }}`

/**
 * Returns the `${{ github.PATH }}` expression string for a GitHub Actions context property.
 *
 * The `path` argument is dot-delimited — each segment navigates one level of the `github`
 * context object (e.g., `'event.pull_request.number'` becomes `${{ github.event.pull_request.number }}`).
 *
 * @param path - Dot-delimited path into the `github` context (e.g., `'ref'`, `'event.pull_request.number'`).
 * @returns A GitHub Actions expression string.
 * @see https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs#github-context
 * @example
 * ```ts
 * steps: [
 *   { run: 'echo $PR_NUMBER', env: { PR_NUMBER: github('event.pull_request.number') } },
 * ]
 * ```
 */
export const github = (path: string): string => `\${{ github.${path} }}`

/**
 * Returns the `${{ needs.JOB_ID.outputs.KEY }}` expression string for a dependent job output.
 *
 * The upstream job must declare the key in its `outputs:` map, and the consuming job must
 * list the upstream job in its own `needs:` array. TypeScript cannot enforce this cross-job
 * contract today; Phase 2 inference will close this gap.
 *
 * @param jobId - The id of the upstream job (must appear in the current job's `needs` array).
 * @param key - The output key declared in the upstream job's `outputs` map.
 * @returns A GitHub Actions expression string.
 * @example
 * ```ts
 * jobs: {
 *   test: {
 *     'runs-on': 'ubuntu-latest',
 *     outputs: { sha: '${{ steps.git.outputs.sha }}' },
 *     steps: [...],
 *   },
 *   deploy: {
 *     needs: ['test'],
 *     'runs-on': 'ubuntu-latest',
 *     steps: [
 *       { run: `echo ${needs('test', 'sha')}` },
 *     ],
 *   },
 * }
 * ```
 */
export const needs = (jobId: string, key: string): string => `\${{ needs.${jobId}.outputs.${key} }}`

/**
 * Returns the `${{ steps.STEP_ID.outputs.KEY }}` expression string for a step output.
 *
 * The step must have an `id` field set to `stepId`, and must have written `KEY` to
 * `$GITHUB_OUTPUT` during its execution. TypeScript cannot yet enforce that the step id
 * matches; Phase 2 will introduce typed step output inference via the `UsesStep` generics.
 *
 * @param stepId - The `id` of the step that wrote the output.
 * @param key - The output key written to `$GITHUB_OUTPUT`.
 * @returns A GitHub Actions expression string.
 * @example
 * ```ts
 * steps: [
 *   { id: 'meta', run: 'echo "version=1.0.0" >> $GITHUB_OUTPUT' },
 *   { run: `echo ${stepOutput('meta', 'version')}` },
 * ]
 * ```
 */
export const stepOutput = (stepId: string, key: string): string =>
  `\${{ steps.${stepId}.outputs.${key} }}`

/**
 * Returns the `${{ matrix.KEY }}` expression string for a matrix dimension value.
 *
 * Use inside a job that has a `strategy.matrix` defined. The key must match one of the
 * matrix dimension names.
 *
 * @param key - The matrix dimension name.
 * @returns A GitHub Actions expression string.
 * @example
 * ```ts
 * strategy: { matrix: { 'node-version': ['18', '20', '22'] } },
 * steps: [
 *   setupNode({ with: { 'node-version': matrix('node-version') } }),
 * ]
 * ```
 */
export const matrix = (key: string): string => `\${{ matrix.${key} }}`

/**
 * Wraps an arbitrary expression body in `${{ ... }}`.
 *
 * @remarks
 * Prefer the typed helpers (`secret`, `variable`, `github`, `needs`, `stepOutput`, `matrix`)
 * when possible. Use `expr` only for complex boolean logic, function calls, or other
 * expressions that the typed helpers do not cover (e.g., `expr("contains(github.ref, 'main')")`).
 *
 * @param body - Raw expression body, without the surrounding `${{ }}` delimiters.
 * @returns A GitHub Actions expression string.
 * @example
 * ```ts
 * steps: [
 *   { run: 'deploy.sh', if: expr("github.event_name == 'push' && !cancelled()") },
 * ]
 * ```
 */
export const expr = (body: string): string => `\${{ ${body} }}`
