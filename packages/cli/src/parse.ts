import { parse } from 'yaml'

export type ParsedInput = {
  key: string
  description: string
  required: boolean
  default?: string | boolean | number
  inferredType: 'string' | 'boolean | string' | 'number | string'
}

export type ParsedOutput = {
  key: string
  description: string
}

export type ParsedAction = {
  name: string
  description: string
  inputs: ParsedInput[]
  outputs: ParsedOutput[]
  runsUsing: string
}

// Infer TS type union from the YAML default value's JS type
const inferType = (defaultValue: unknown): ParsedInput['inferredType'] => {
  if (typeof defaultValue === 'boolean') return 'boolean | string'
  if (typeof defaultValue === 'number') return 'number | string'
  return 'string'
}

export const parseActionYaml = (raw: string): ParsedAction => {
  const doc = parse(raw) as Record<string, unknown>

  const rawInputs = (doc.inputs ?? {}) as Record<string, Record<string, unknown>>
  const rawOutputs = (doc.outputs ?? {}) as Record<string, Record<string, unknown>>
  const runs = (doc.runs ?? {}) as Record<string, unknown>

  const inputs: ParsedInput[] = Object.entries(rawInputs).map(([key, val]) =>
    Object.assign(
      { key, description: String(val.description ?? ``), required: val.required === true },
      val.default !== undefined ? { default: val.default as string | boolean | number } : {},
      { inferredType: inferType(val.default) },
    ),
  )

  const outputs: ParsedOutput[] = Object.entries(rawOutputs).map(([key, val]) => ({
    key,
    description: String(val.description ?? ''),
  }))

  return {
    name: String(doc.name ?? ''),
    description: String(doc.description ?? ''),
    inputs,
    outputs,
    runsUsing: String(runs.using ?? ''),
  }
}
