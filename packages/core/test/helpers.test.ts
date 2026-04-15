import { describe, it, expect } from 'vitest'
import { secret, variable, env, github, needs, stepOutput, matrix, expr } from '../src/define.ts'

describe('expression helpers', () => {
  it('secret()', () => {
    expect(secret('NPM_TOKEN')).toBe('${{ secrets.NPM_TOKEN }}')
  })

  it('variable()', () => {
    expect(variable('FOO')).toBe('${{ vars.FOO }}')
  })

  it('env()', () => {
    expect(env('HOME')).toBe('${{ env.HOME }}')
  })

  it('github()', () => {
    expect(github('event_name')).toBe('${{ github.event_name }}')
  })

  it('needs()', () => {
    expect(needs('build', 'sha')).toBe('${{ needs.build.outputs.sha }}')
  })

  it('stepOutput()', () => {
    expect(stepOutput('step1', 'result')).toBe('${{ steps.step1.outputs.result }}')
  })

  it('matrix()', () => {
    expect(matrix('node')).toBe('${{ matrix.node }}')
  })

  it("expr() wraps a raw body in ${{ }}", () => {
    expect(expr("success() && github.ref == 'refs/heads/main'")).toBe(
      "${{ success() && github.ref == 'refs/heads/main' }}"
    )
  })
})
