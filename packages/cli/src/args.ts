export type BuildArgs = {
  cmd: string
  check: boolean
  cwd: string
}

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
