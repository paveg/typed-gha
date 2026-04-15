import type { Workflow } from './types.ts'

export const defineWorkflow = <const T extends Workflow>(workflow: T): T => workflow

export const secret = (name: string): string => `\${{ secrets.${name} }}`
export const variable = (name: string): string => `\${{ vars.${name} }}`
export const env = (name: string): string => `\${{ env.${name} }}`
export const github = (path: string): string => `\${{ github.${path} }}`
export const needs = (jobId: string, key: string): string => `\${{ needs.${jobId}.outputs.${key} }}`
export const stepOutput = (stepId: string, key: string): string =>
  `\${{ steps.${stepId}.outputs.${key} }}`
export const matrix = (key: string): string => `\${{ matrix.${key} }}`
export const expr = (body: string): string => `\${{ ${body} }}`
