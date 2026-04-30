import type { EnumKeyKind } from './enum'
import type { CollisionItem, RejectedReport, RejectedStats } from './reports'

// Shared payload building blocks to reduce duplication in error contexts

type AtIndex = { index: number }
type WithValue = { value: string }
type WithText = Readonly<{ text: string }>
type WithUnknownValue = { value: unknown }
type WithIndexValue = AtIndex & WithValue
type WithReceivedType = Readonly<{ receivedType: string }>
type Empty = Readonly<Record<never, never>>

// Collision error payload: kind + stable diagnostics + structured tuples for tooling
// Includes "count" for cheap metrics/logging without recomputing
type WithCollision = Readonly<{
  kind: EnumKeyKind
  details: readonly string[]
  collisions: readonly CollisionItem[]
  count: number
}>

// Aggregated definition rejection payload
type WithDefinitionRejected = Readonly<{
  // Human-readable lines for console output and logs
  details: readonly string[]

  // Structured report for tooling
  report: RejectedReport

  // Quick stats for dashboards / logs
  stats: RejectedStats
}>

// Error payloads keyed by error code as a single source of truth
type ErrorPayloadByCode = {
  internalInvariant: WithText

  notArray: WithReceivedType
  emptyArray: Empty

  notString: AtIndex & WithReceivedType
  tooShort: WithIndexValue & { minLength: number }

  invalidChars: WithIndexValue & {
    invalidChar: string
    position?: number | undefined
  }

  invalidValue: WithReceivedType &
    WithUnknownValue & { expected: readonly string[] }

  mixedSeparatorStyles: WithIndexValue
  badSeparatorPlacement: WithIndexValue
  numericOnly: WithIndexValue
  startsWithDigit: WithIndexValue
  separatedMustBeLowercase: WithIndexValue
  notMeaningful: WithIndexValue
  capsOnly: WithIndexValue

  duplicate: WithIndexValue
  collision: WithCollision

  definitionRejected: WithDefinitionRejected
}

/** Derived union of all valid error codes with no manual list */
export type EnumErrorCode = keyof ErrorPayloadByCode

/** Structured error context discriminated by `code` */
export type EnumErrorContext = {
  [Code in EnumErrorCode]: Readonly<{ code: Code } & ErrorPayloadByCode[Code]>
}[EnumErrorCode]
