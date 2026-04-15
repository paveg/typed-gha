/**
 * All GitHub Actions event names recognised by this library.
 *
 * The union includes a `string & {}` fallback so that any event name GitHub may introduce in the
 * future (or lesser-known events not yet listed here) is accepted by TypeScript without a cast,
 * while known values still benefit from autocomplete.
 */
export type EventName =
  | 'push'
  | 'pull_request'
  | 'pull_request_target'
  | 'workflow_dispatch'
  | 'workflow_call'
  | 'schedule'
  | 'release'
  | 'issues'
  | 'issue_comment'
  | 'repository_dispatch'
  | 'create'
  | 'delete'
  | 'deployment'
  | 'deployment_status'
  | 'fork'
  | 'gollum'
  | 'label'
  | 'merge_group'
  | 'milestone'
  | 'page_build'
  | 'project'
  | 'project_card'
  | 'project_column'
  | 'public'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'registry_package'
  | 'status'
  | 'watch'
  | 'workflow_run'
  | (string & {})

/**
 * The `on:` field of a workflow — three forms are accepted:
 *
 * 1. **Single event** — a bare event name string: `'push'`.
 * 2. **Event array** — triggers on any of the listed events: `['push', 'pull_request']`.
 * 3. **Event object** — per-event configuration (branches, types, paths, etc.):
 *    `{ push: { branches: ['main'] }, pull_request: null }`.
 *
 * The `string & {}` fallback on `EventName` means that unknown event names are allowed even
 * in the object form — pass a plain string and TypeScript will accept it.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#on
 */
export type Trigger =
  | EventName
  | readonly EventName[]
  | Partial<Record<EventName, Record<string, unknown> | null>>

/**
 * The allowed values for a single permission scope within a `Permissions` object.
 */
export type PermissionValue = 'read' | 'write' | 'none'

/**
 * Workflow or job-level GITHUB_TOKEN permissions.
 *
 * Two modes:
 * - **Scalar** (`'read-all'` | `'write-all'`): sets all scopes at once.
 * - **Scope object**: grant per-scope access levels — any scope not listed defaults to `'none'`.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#permissions
 */
export type Permissions =
  | 'read-all'
  | 'write-all'
  | {
      actions?: PermissionValue
      checks?: PermissionValue
      contents?: PermissionValue
      deployments?: PermissionValue
      discussions?: PermissionValue
      'id-token'?: PermissionValue
      issues?: PermissionValue
      packages?: PermissionValue
      pages?: PermissionValue
      'pull-requests'?: PermissionValue
      'repository-projects'?: PermissionValue
      'security-events'?: PermissionValue
      statuses?: PermissionValue
    }

/**
 * The `runs-on:` value for a job — either a known GitHub-hosted runner label or an array
 * of labels for self-hosted runners.
 *
 * The `string & {}` escape hatch and the `readonly (string & {})[]` array form allow
 * self-hosted runner labels and any future GitHub-hosted runners without a cast. When using
 * an array, GitHub matches a runner that has ALL the listed labels.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idruns-on
 */
export type RunsOn =
  | 'ubuntu-latest'
  | 'ubuntu-24.04'
  | 'ubuntu-22.04'
  | 'macos-latest'
  | 'macos-14'
  | 'macos-13'
  | 'windows-latest'
  | 'windows-2022'
  | 'self-hosted'
  | (string & {})
  | readonly (string & {})[]

/**
 * The shell interpreter for a `run:` step. Known values are offered as autocomplete;
 * the `string & {}` fallback allows custom shell paths (e.g., `/usr/local/bin/fish`).
 */
export type Shell = 'bash' | 'sh' | 'pwsh' | 'powershell' | 'python' | (string & {})

/**
 * A step that executes an inline shell script via `run:`.
 *
 * At least `run` is required. Provide `id` if subsequent steps or the job's `outputs` map
 * need to reference this step's outputs via `stepOutput()`.
 */
export type RunStep = {
  run: string
  id?: string
  name?: string
  if?: string
  shell?: Shell
  'working-directory'?: string
  env?: Record<string, string | number | boolean>
  'continue-on-error'?: boolean | string
  'timeout-minutes'?: number
}

/**
 * A step that invokes a reusable GitHub Action via `uses:`.
 *
 * The three generic parameters enable future typed-output inference:
 * - `Ref` — the action reference literal (e.g., `'actions/checkout@v4'`); preserved as a
 *   literal type so the compiler can match the step to its action-specific `Outputs` map.
 * - `Id` — the `id` field literal; used by `stepOutput()` to cross-reference this step.
 * - `Outputs` — the shape of outputs the action writes to `$GITHUB_OUTPUT`; currently
 *   phantom (carried for future inference, not consumed at runtime).
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsuses
 */
export type UsesStep<
  Ref extends string = string,
  Id extends string = string,
  Outputs extends Record<string, string> = Record<string, never>,
> = {
  uses: Ref
  id?: Id
  name?: string
  if?: string
  with?: Record<string, string | number | boolean>
  env?: Record<string, string | number | boolean>
  'continue-on-error'?: boolean | string
  'timeout-minutes'?: number
  'working-directory'?: string
  /**
   * Type-only slot for an action's declared outputs. Consumers must not set or read this at
   * runtime — it exists solely to carry the `Outputs` type parameter through inference and is
   * stripped from emitted YAML by `emitYaml` (any key prefixed with `__` is removed).
   *
   * @internal
   */
  __outputs?: Outputs
}

/** A workflow step — either a shell `run:` step or an action `uses:` step. */
// UsesStep with any Outputs shape is a valid Step
export type Step = RunStep | UsesStep<string, string, Record<string, string>>

/**
 * Concurrency settings that prevent overlapping workflow runs for the same group key.
 *
 * When a new run starts for a group that already has a run in progress, the behavior depends
 * on `cancel-in-progress`: `true` cancels the old run; `false` queues the new one.
 */
export type Concurrency = {
  group: string
  'cancel-in-progress'?: boolean | string
}

/**
 * Default shell and working-directory settings for all `run:` steps in a workflow or job.
 *
 * Values here are inherited by every `run:` step unless the step overrides them explicitly.
 */
export type Defaults = {
  run?: {
    shell?: Shell
    'working-directory'?: string
  }
}

/**
 * Build matrix configuration for a job.
 *
 * The `matrix` record defines one or more dimensions (e.g., `{ 'node-version': ['18', '20'] }`).
 * GitHub Actions creates one job run per combination of dimension values. Use `matrix()` from
 * `define.ts` to reference dimension values within the job definition.
 */
export type Strategy = {
  matrix: Record<string, unknown>
  'fail-fast'?: boolean
  'max-parallel'?: number
}

/**
 * A single job within a workflow.
 *
 * `runs-on` and `steps` are required; everything else is optional. Use `needs` to declare
 * dependencies on other jobs; the dependent job runs only after all listed jobs complete
 * successfully.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id
 */
export type Job = {
  'runs-on': RunsOn
  name?: string
  needs?: string | readonly string[]
  if?: string
  permissions?: Permissions
  env?: Record<string, string | number | boolean>
  defaults?: Defaults
  outputs?: Record<string, string>
  strategy?: Strategy
  'continue-on-error'?: boolean | string
  'timeout-minutes'?: number
  concurrency?: Concurrency
  environment?: string | { name: string; url?: string }
  steps: readonly Step[]
}

/**
 * Root object for a GitHub Actions workflow file.
 *
 * Pass this to `defineWorkflow` and then `emitYaml` to produce a `.yml` file. The `on`
 * field is required; everything else is optional.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
 */
export type Workflow = {
  name?: string
  'run-name'?: string
  on: Trigger
  permissions?: Permissions
  env?: Record<string, string | number | boolean>
  defaults?: Defaults
  concurrency?: Concurrency
  jobs: Record<string, Job>
}
