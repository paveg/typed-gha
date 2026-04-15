#!/usr/bin/env node
import { readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../dist/index.js')
const src = readFileSync(target, 'utf8')
if (!src.startsWith('#!')) {
  console.error(`${target}: expected shebang on first line`)
  process.exit(1)
}
const rewritten = src.replace(/^#![^\n]*\n/, '#!/usr/bin/env node\n')
writeFileSync(target, rewritten)
chmodSync(target, 0o755)
