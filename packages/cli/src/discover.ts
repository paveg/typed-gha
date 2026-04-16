import { glob } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Finds all typed workflow source files under a directory tree.
 *
 * @remarks
 * Searches recursively under `cwd` for files whose path matches
 * `.github/workflows/NAME.workflow.ts` at any depth. The `node_modules`
 * directory at any nesting level is excluded. All returned paths are absolute
 * (resolved relative to `cwd`), making them safe to pass directly to file I/O
 * functions regardless of the caller's working directory.
 *
 * @param cwd - Root directory to search from.
 * @returns Promise resolving to an array of absolute paths to discovered workflow source files.
 */
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
