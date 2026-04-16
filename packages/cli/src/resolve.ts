import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCb)

export type ActionSource = {
  raw: string
  ref: string
  repoUrl: string | null
}

const isLocalPath = (input: string): boolean =>
  input.startsWith('./') || input.startsWith('../') || input.startsWith('/')

const readLocalFile = async (filePath: string): Promise<string> => readFile(filePath, 'utf8')

const resolveLocalPath = async (input: string): Promise<ActionSource> => {
  let filePath = input

  // Determine if input points directly to a file or a directory
  let isFile = input.endsWith('.yml') || input.endsWith('.yaml')

  if (!isFile) {
    // Stat to check
    try {
      const s = await stat(input)
      isFile = s.isFile()
    } catch {
      // If stat fails, treat as directory attempt
      isFile = false
    }
  }

  if (isFile) {
    const raw = await readLocalFile(filePath)
    return { raw, ref: input, repoUrl: null }
  }

  // Directory: try action.yml then action.yaml
  const ymlPath = join(input, 'action.yml')
  try {
    const raw = await readLocalFile(ymlPath)
    return { raw, ref: input, repoUrl: null }
  } catch {
    // fall through to .yaml
  }

  const yamlPath = join(input, 'action.yaml')
  try {
    const raw = await readLocalFile(yamlPath)
    return { raw, ref: input, repoUrl: null }
  } catch {
    throw new Error(`No action.yml found at ${input}`)
  }
}

const ghFetch = async (owner: string, name: string, ref: string, filename: string): Promise<string> => {
  const { stdout } = await execFile('gh', [
    'api',
    `repos/${owner}/${name}/contents/${filename}?ref=${ref}`,
    '--jq',
    '.content',
  ])
  // The content is base64-encoded with newlines; strip them before decoding
  const b64 = stdout.replace(/\n/g, '').trim()
  return Buffer.from(b64, 'base64').toString('utf8')
}

const httpFetch = async (owner: string, name: string, ref: string, filename: string): Promise<string> => {
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${filename}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

const resolveRemote = async (input: string): Promise<ActionSource> => {
  const pattern = /^([^/]+)\/([^@]+)@(.+)$/
  const match = input.match(pattern)

  if (!match) {
    throw new Error(`ref is required (e.g., ${input}@v4)`)
  }

  const [, owner, name, ref] = match as [string, string, string, string]
  const repoUrl = `https://github.com/${owner}/${name}`

  // Try gh CLI first (action.yml then action.yaml)
  for (const filename of ['action.yml', 'action.yaml']) {
    try {
      const raw = await ghFetch(owner, name, ref, filename)
      return { raw, ref: input, repoUrl }
    } catch {
      // continue
    }
  }

  // Fallback to raw githubusercontent.com
  for (const filename of ['action.yml', 'action.yaml']) {
    try {
      const raw = await httpFetch(owner, name, ref, filename)
      return { raw, ref: input, repoUrl }
    } catch {
      // continue
    }
  }

  throw new Error(`No action.yml found at ${owner}/${name}@${ref}`)
}

export const resolveAction = async (input: string): Promise<ActionSource> => {
  if (isLocalPath(input)) {
    return resolveLocalPath(input)
  }
  return resolveRemote(input)
}
