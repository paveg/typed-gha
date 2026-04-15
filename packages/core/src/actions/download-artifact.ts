import { makeAction } from './_factory.ts'

export type DownloadArtifactInputs = {
  name?: string
  path?: string
  pattern?: string
  'merge-multiple'?: boolean | string
  'github-token'?: string
  repository?: string
  'run-id'?: string | number
  'artifact-ids'?: string
}

export type DownloadArtifactOutputs = {
  'download-path': string
}

export const downloadArtifact = makeAction<'actions/download-artifact@v4', DownloadArtifactInputs, DownloadArtifactOutputs>(
  'actions/download-artifact@v4',
)
