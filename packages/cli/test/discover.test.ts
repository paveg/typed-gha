import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findWorkflows } from '../src/discover.js'

describe('findWorkflows', () => {
  let tmp = ''

  afterEach(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('discovers workflow files and excludes non-ts and node_modules', async () => {
    tmp = await mkdtemp(join(tmpdir(), 'typed-gha-discover-'))

    // .github/workflows
    const wfDir = join(tmp, '.github', 'workflows')
    await mkdir(wfDir, { recursive: true })
    await writeFile(join(wfDir, 'ci.workflow.ts'), 'export default {}')
    await writeFile(join(wfDir, 'nightly.workflow.ts'), 'export default {}')
    await writeFile(join(wfDir, 'ignore.txt'), 'not a workflow')

    // nested .github/workflows
    const deepDir = join(tmp, 'nested', '.github', 'workflows')
    await mkdir(deepDir, { recursive: true })
    await writeFile(join(deepDir, 'deep.workflow.ts'), 'export default {}')

    // node_modules — should be excluded
    const nmDir = join(tmp, 'node_modules', '.github', 'workflows')
    await mkdir(nmDir, { recursive: true })
    await writeFile(join(nmDir, 'should-ignore.workflow.ts'), 'export default {}')

    const found = await findWorkflows(tmp)
    const names = found.map(p => p.split('/').pop())

    expect(found).toHaveLength(3)
    expect(names).toContain('ci.workflow.ts')
    expect(names).toContain('nightly.workflow.ts')
    expect(names).toContain('deep.workflow.ts')
    expect(names).not.toContain('ignore.txt')
    expect(names).not.toContain('should-ignore.workflow.ts')

    // All paths are absolute
    for (const p of found) {
      expect(p.startsWith('/')).toBe(true)
    }
  })
})
