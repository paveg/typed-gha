import { tsImport } from 'tsx/esm/api'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Mimic build.test.ts: tmpdir + .github/workflows/, NO package.json in tmpdir
const dir = mkdtempSync(join(tmpdir(), 'probe2-'))
mkdirSync(join(dir, '.github/workflows'), { recursive: true })

const probe = async (name, src) => {
  const f = join(dir, '.github/workflows', name)
  writeFileSync(f, src)
  const mod = await tsImport(pathToFileURL(f).href, import.meta.url)
  console.log(`\n=== ${name} (no package.json) ===`)
  console.log('keys:', Object.keys(mod))
  console.log('mod.default type:', typeof mod.default)
  console.log('mod.default:', JSON.stringify(mod.default))
  if (mod.default && typeof mod.default === 'object') {
    console.log('  __esModule:', mod.default.__esModule)
    console.log('  inner keys:', Object.keys(mod.default))
  }
}

await probe('default-obj.workflow.ts', 'export default { on: "push", jobs: {} }')
await probe('named-only.workflow.ts', 'export const x = {}')
await probe('default-null.workflow.ts', 'export default null')
await probe('default-string.workflow.ts', 'export default "hello"')
