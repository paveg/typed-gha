import { makeAction } from './_factory.ts'

export type WranglerInputs = {
  apiToken?: string
  accountId?: string
  workingDirectory?: string
  wranglerVersion?: string
  // Narrowed beyond upstream docs: the action only recognises these four package managers
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  preCommands?: string
  command?: string
  environment?: string
  secrets?: string
  vars?: string
}

export type WranglerOutputs = {
  'command-output': string
  'deployment-url': string
  'pages-deployment-alias-url': string
}

export const wrangler = makeAction<'cloudflare/wrangler-action@v3', WranglerInputs, WranglerOutputs>(
  'cloudflare/wrangler-action@v3',
)
