/**
 * Parsed CLI arguments for the `gha` command.
 *
 * - `cmd` — the subcommand name (e.g., `'build'`). Defaults to `'build'` when omitted.
 * - `check` — when `true`, run in check mode: compare generated YAML against existing files
 *   instead of writing them. Corresponds to the `--check` flag.
 * - `cwd` — the root directory to search for workflow sources. Defaults to `process.cwd()`.
 *   Overridden by `--cwd <path>`.
 */
export type BuildArgs = {
  cmd: string
  check: boolean
  cwd: string
}

/**
 * Parses CLI arguments into a `BuildArgs` object.
 *
 * Expects `argv` in standard Node.js form: `argv[0]` is the node executable path,
 * `argv[1]` is the script path, and actual arguments start at index 2. Typically called
 * as `parseArgs(process.argv)`.
 *
 * @param argv - The raw argument vector, usually `process.argv`.
 * @returns Parsed `BuildArgs` with defaults applied for missing flags.
 * @throws When an unknown flag is encountered or `--cwd` is provided without a value.
 */
export const parseArgs = (argv: readonly string[]): BuildArgs => {
  const args: BuildArgs = { cmd: argv[2] ?? 'build', check: false, cwd: process.cwd() }
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
  return args
}
