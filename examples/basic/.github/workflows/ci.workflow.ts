import { defineWorkflow, secret, matrix } from '@typed-gha/core'
import { checkout, setupNode, setupPnpm } from '@typed-gha/core/actions'

export default defineWorkflow({
  on: {
    push: { branches: ['main'] },
    pull_request: {},
  },
  permissions: { contents: 'read' },
  jobs: {
    test: {
      'runs-on': 'ubuntu-latest',
      strategy: {
        matrix: { 'node-version': ['20', '22'] },
      },
      steps: [
        checkout(),
        setupPnpm(),
        setupNode({ with: { 'node-version': matrix('node-version'), cache: 'pnpm' } }),
        { run: 'pnpm install --frozen-lockfile' },
        { run: 'pnpm test' },
      ],
    },
    publish: {
      needs: 'test',
      if: "github.event_name == 'push'",
      'runs-on': 'ubuntu-latest',
      permissions: { contents: 'read', 'id-token': 'write' },
      steps: [
        checkout(),
        setupNode({ with: { 'node-version': '22', 'registry-url': 'https://registry.npmjs.org' } }),
        { run: 'npm publish --provenance', env: { NODE_AUTH_TOKEN: secret('NPM_TOKEN') } },
      ],
    },
  },
})
