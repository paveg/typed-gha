import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { resolveAction, type ActionSource } from './resolve.js'
import { parseActionYaml } from './parse.js'
import { generateWrapper } from './generate.js'

export type AddResult = {
  outputPath: string
  ref: string
}

const deriveFileName = (source: ActionSource): string => {
  // Remote: 'actions/checkout@v4' → 'actions-checkout.ts'
  const remoteMatch = source.ref.match(/^([^/]+)\/([^@]+)@/)
  if (remoteMatch) return `${remoteMatch[1]}-${remoteMatch[2]}.ts`

  // Local: use the basename of the action directory/file
  const clean = source.ref.replace(/\/+$/, '').replace(/\/action\.ya?ml$/, '')
  return `${basename(clean)}.ts`
}

export const runAdd = async (opts: { ref: string; dir: string }): Promise<AddResult> => {
  const source = await resolveAction(opts.ref)
  const parsed = parseActionYaml(source.raw)
  const code = generateWrapper(parsed, source)
  const fileName = deriveFileName(source)
  const outDir = resolve(opts.dir)
  await mkdir(outDir, { recursive: true })
  const outputPath = resolve(outDir, fileName)
  await writeFile(outputPath, code)
  return { outputPath, ref: opts.ref }
}
