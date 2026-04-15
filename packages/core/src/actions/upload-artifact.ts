import { makeAction } from './_factory.ts'

export type UploadArtifactInputs = {
  name?: string
  path?: string
  // Narrowed beyond upstream docs: the action only recognises these three values
  'if-no-files-found'?: 'warn' | 'error' | 'ignore'
  'retention-days'?: number | string
  'compression-level'?: number | string
  overwrite?: boolean | string
  'include-hidden-files'?: boolean | string
}

export type UploadArtifactOutputs = {
  'artifact-id': string
  'artifact-url': string
  'artifact-digest': string
}

export const uploadArtifact = makeAction<'actions/upload-artifact@v4', UploadArtifactInputs, UploadArtifactOutputs>(
  'actions/upload-artifact@v4',
)
