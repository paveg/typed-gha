import { defineWorkflow, matrix } from '@typed-gha/core'
import { checkout, setupNode, setupPnpm } from '@typed-gha/core/actions'

export default defineWorkflow({
  name: 'CI',
  on: {
    push: { branches: ['main'] },
    pull_request: {},
  },
  permissions: { contents: 'read' },
  jobs: {
    lint: {
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout(),
        setupPnpm(),
        setupNode({ with: { 'node-version': '22', cache: 'pnpm' } }),
        { name: 'Install', run: 'pnpm install --frozen-lockfile' },
        { name: 'Typecheck', run: 'pnpm -r typecheck' },
        { name: 'Workflow drift', run: 'pnpm exec gha build --check' },
      ],
    },
    test: {
      'runs-on': 'ubuntu-latest',
      strategy: {
        matrix: { 'node-version': ['22', '24'] },
      },
      steps: [
        checkout(),
        setupPnpm(),
        setupNode({ with: { 'node-version': matrix('node-version'), cache: 'pnpm' } }),
        { name: 'Install', run: 'pnpm install --frozen-lockfile' },
        { name: 'Test', run: 'pnpm -r test' },
      ],
    },
  },
})
