import { glob } from 'node:fs/promises'
import { resolve } from 'node:path'

export const findWorkflows = async (cwd: string): Promise<readonly string[]> => {
  const matches: string[] = []
  // glob returns an AsyncIterator in Node 22
  for await (const match of glob('**/.github/workflows/*.workflow.ts', {
    cwd,
    exclude: (name) => name === 'node_modules',
  })) {
    matches.push(resolve(cwd, match))
  }
  return matches
}
