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

export type Trigger =
  | EventName
  | readonly EventName[]
  | Partial<Record<EventName, Record<string, unknown> | null>>

export type PermissionValue = 'read' | 'write' | 'none'

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

export type Shell = 'bash' | 'sh' | 'pwsh' | 'powershell' | 'python' | (string & {})

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
  /** Phantom field — never set at runtime; carries output type information only */
  __outputs?: Outputs
}

// UsesStep with any Outputs shape is a valid Step
export type Step = RunStep | UsesStep<string, string, Record<string, string>>

export type Concurrency = {
  group: string
  'cancel-in-progress'?: boolean | string
}

export type Defaults = {
  run?: {
    shell?: Shell
    'working-directory'?: string
  }
}

export type Strategy = {
  matrix: Record<string, unknown>
  'fail-fast'?: boolean
  'max-parallel'?: number
}

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
