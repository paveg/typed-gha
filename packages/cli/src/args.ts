/**
 * Parsed CLI arguments for the `gha` command.
 *
 * - `cmd` — the subcommand name (e.g., `'build'`, `'add'`). Defaults to `'build'` when omitted.
 * - `check` — when `true`, run in check mode: compare generated YAML against existing files
 *   instead of writing them. Corresponds to the `--check` flag. Only used by the `build`
 *   subcommand.
 * - `cwd` — the root directory to search for workflow sources. Defaults to `process.cwd()`.
 *   Overridden by `--cwd <path>`. Only used by the `build` subcommand.
 * - `ref` — the action reference to add (e.g., `'actions/checkout@v4'` or `'./my-action'`).
 *   Only used by the `add` subcommand.
 * - `dir` — the output directory for generated action wrappers. Defaults to
 *   `'.github/typed-gha-actions'`. Overridden by `--dir <path>`. Only used by the `add`
 *   subcommand.
 */
export type CliArgs = {
  cmd: string
  check: boolean
  cwd: string
  ref: string
  dir: string
}

/**
 * Parses CLI arguments into a `CliArgs` object.
 *
 * Expects `argv` in standard Node.js form: `argv[0]` is the node executable path,
 * `argv[1]` is the script path, and actual arguments start at index 2. Typically called
 * as `parseArgs(process.argv)`.
 *
 * Subcommands:
 * - `build` (default) — accepts `--check` and `--cwd <path>` flags.
 * - `add <ref>` — requires a positional action reference; accepts `--dir <path>`.
 *
 * @param argv - The raw argument vector, usually `process.argv`.
 * @returns Parsed `CliArgs` with defaults applied for missing flags.
 * @throws When an action ref is missing for `add`, an unknown flag is encountered, or a
 *   flag requiring a value is provided without one.
 */
export const parseArgs = (argv: readonly string[]): CliArgs => {
  const cmd = argv[2] ?? 'build'
  const args: CliArgs = {
    cmd,
    check: false,
    cwd: process.cwd(),
    ref: '',
    dir: '.github/typed-gha-actions',
  }

  if (cmd === 'add') {
    const ref = argv[3]
    if (!ref || ref.startsWith('--')) throw new Error('action ref is required (e.g., gha add actions/checkout@v4)')
    args.ref = ref
    for (let i = 4; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--dir') {
        const next = argv[i + 1]
        if (next === undefined) throw new Error('--dir requires a value')
        args.dir = next
        i++
      } else {
        throw new Error(`Unknown flag: ${arg}`)
      }
    }
  } else {
    for (let i = 3; i < argv.length; i++) {
      const arg = argv[i]
      if (arg === '--check') args.check = true
      else if (arg === '--cwd') {
        const next = argv[i + 1]
        if (next === undefined) throw new Error('--cwd requires a value')
        args.cwd = next
        i++
      } else throw new Error(`Unknown flag: ${arg}`)
    }
  }
  return args
}
