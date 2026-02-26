import type { EnumErrorContext, RejectedReport, RejectedStats } from '../types'
import { buildDefinitionRejectedDetails } from './reports'
import { toEnumKeys } from './transforms'
import { collectCollisions, collectEnumValues } from './validators'

// Shared error code token for the aggregated definitionRejected payload
// Keeps Extract<> and ctx construction type-safe and consistent
const CODE_DEFINITION_REJECTED = 'definitionRejected' as const

// Narrowed payload shape for the aggregated definitionRejected error
type DefinitionRejectedCtx = Extract<
  EnumErrorContext,
  { code: typeof CODE_DEFINITION_REJECTED }
>

/* Result model for fail-fast shape checks + aggregated value-level issues */

export type PrepareDefinitionOk = Readonly<{ ok: true }>

export type PrepareDefinitionErr = Readonly<{
  ok: false
  error: DefinitionRejectedCtx
}>

export type PrepareDefinitionResult = PrepareDefinitionOk | PrepareDefinitionErr

// Builder helper: mutates local arrays in the sources map
// Contract: map is internal-only; final collision payload is normalized/frozen by collectors
function addSource(
  map: Map<string, string[]>,
  key: string,
  source: string,
): void {
  const list = map.get(key)

  if (!list) {
    map.set(key, [source])

    return
  }

  list.push(source)
}

/* Aggregates validation outcome into a single definitionRejected payload
   Contract: shape errors are fail-fast (thrown by collectors); value-level issues are aggregated */
export const prepareDefinition = (values: unknown): PrepareDefinitionResult => {
  const collected = collectEnumValues(values)

  // Build collision sources only from valid values
  const constantsSources = new Map<string, string[]>()
  const namesSources = new Map<string, string[]>()

  for (const value of collected.valid) {
    const { constantKey, nameKey } = toEnumKeys(value)

    addSource(constantsSources, constantKey, value)
    addSource(namesSources, nameKey, value)
  }

  const constants = collectCollisions(constantsSources)
  const names = collectCollisions(namesSources)

  const report = Object.freeze({
    invalid: collected.invalid,
    duplicates: collected.duplicates,
    collisions: Object.freeze({
      constants,
      names,
    }),
  } satisfies RejectedReport)

  // Small stats block for quick diagnostics and dashboards
  const stats = Object.freeze({
    received: collected.received,
    valid: collected.valid.length,
    invalid: collected.invalid.length,
    duplicates: collected.duplicates.length,
    collisions: Object.freeze({
      total: constants.length + names.length,
      constants: constants.length,
      names: names.length,
    }),
  } satisfies RejectedStats)

  const hasDefinitionIssues =
    stats.invalid > 0 || stats.duplicates > 0 || stats.collisions.total > 0

  if (!hasDefinitionIssues) {
    return Object.freeze({ ok: true })
  }

  const details = buildDefinitionRejectedDetails(report, stats)

  const ctx = Object.freeze({
    code: CODE_DEFINITION_REJECTED,
    details,
    report,
    stats,
  } satisfies DefinitionRejectedCtx)

  return Object.freeze({ ok: false, error: ctx })
}
