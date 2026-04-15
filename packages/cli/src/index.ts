#!/usr/bin/env -S npx tsx
import { runBuild } from './build.ts'
import { parseArgs } from './args.ts'

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv)
  if (args.cmd !== 'build') {
    process.stderr.write(`Unknown command: ${args.cmd}\n`)
    process.exit(2)
  }
  const result = await runBuild({ cwd: args.cwd, check: args.check })
  for (const p of result.written) process.stdout.write(`wrote: ${p}\n`)
  for (const p of result.drift) process.stderr.write(`drift: ${p}\n`)
  if (args.check && result.drift.length > 0) process.exit(1)
}

void main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.stack ?? e.message : String(e)}\n`)
  process.exit(1)
})
