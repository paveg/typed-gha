import { resolve } from 'node:path'

export default {
  test: {
    include: ['test/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--import', 'tsx/esm'],
      },
    },
  },
  resolve: {
    alias: {
      '@typed-gha/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
}
