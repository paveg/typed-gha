import { tsImport } from 'tsx/esm/api'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = mkdtempSync(join(tmpdir(), 'probe-'))
writeFileSync(join(dir, 'package.json'), '{"type":"module"}')

const probe = async (name, src) => {
  const f = join(dir, name)
  writeFileSync(f, src)
  const mod = await tsImport(pathToFileURL(f).href, import.meta.url)
  console.log(`\n=== ${name} ===`)
  console.log('keys:', Object.keys(mod))
  console.log('mod:', JSON.stringify(mod, (k, v) => typeof v === 'function' ? '[fn]' : v))
  console.log('mod.default type:', typeof mod.default)
  if (mod.default && typeof mod.default === 'object') {
    console.log('  has __esModule:', '__esModule' in mod.default, mod.default.__esModule)
    console.log('  has default key:', 'default' in mod.default)
  }
}

await probe('default-obj.ts', 'export default { on: "push", jobs: {} }')
await probe('named-only.ts', 'export const x = {}')
await probe('default-null.ts', 'export default null')
await probe('default-string.ts', 'export default "hello"')
