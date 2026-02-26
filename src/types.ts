/** Tuple of enum values used as a single source of truth */
export type EnumValues = readonly [string, ...string[]]

/** Union of allowed values extracted from EnumValues tuple */
export type EnumValue<T extends EnumValues> = T[number]

/** Record mapping generated keys to enum values */
export type EnumRecord<T extends EnumValues> = Readonly<
  Record<string, EnumValue<T>>
>

/** Key generation targets used for collision reporting */
export type EnumKeyKind = 'constants' | 'names'

// Shared payload building blocks to reduce duplication in error contexts

type AtIndex = { index: number }
type WithValue = { value: string }
type WithText = Readonly<{ text: string }>
type WithUnknownValue = { value: unknown }
type WithIndexValue = AtIndex & WithValue
type WithReceivedType = Readonly<{ receivedType: string }>
type Empty = Readonly<Record<never, never>>

/** Collision tuple used by collectors and error payloads (stable, test-friendly shape) */
export type CollisionItem = Readonly<{
  key: string
  sources: readonly string[]
}>

// Collision error payload: kind + stable diagnostics + structured tuples for tooling
// Includes "count" for cheap metrics/logging without recomputing
type WithCollision = Readonly<{
  kind: EnumKeyKind
  details: readonly string[]
  collisions: readonly CollisionItem[]
  count: number
}>

// Base error payloads (single source of truth)
type BaseErrorPayloadByCode = {
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
}

// Value-level errors we can collect without stopping (shape-level stays fail-fast)
type RejectedInvalidCode =
  | 'notString'
  | 'tooShort'
  | 'invalidChars'
  | 'mixedSeparatorStyles'
  | 'badSeparatorPlacement'
  | 'numericOnly'
  | 'startsWithDigit'
  | 'separatedMustBeLowercase'
  | 'notMeaningful'
  | 'capsOnly'

// Derived from BaseErrorPayloadByCode — no duplicated payload shapes
type RejectedInvalidItem = Readonly<
  {
    [K in RejectedInvalidCode]: Readonly<
      { code: K } & BaseErrorPayloadByCode[K]
    >
  }[RejectedInvalidCode]
>

// Duplicate summary: one value, many indexes (we keep duplicates separate from invalids)
type RejectedDuplicateItem = Readonly<{
  value: string
  indexes: readonly number[]
}>

// Collision summary split by kind (only computed on VALID values)
type RejectedCollisionByKind = Readonly<{
  constants: readonly CollisionItem[]
  names: readonly CollisionItem[]
}>

/* Machine-readable report (for dev tools / CI / UI) */
export type RejectedReport = Readonly<{
  invalid: readonly RejectedInvalidItem[]
  duplicates: readonly RejectedDuplicateItem[]
  collisions: RejectedCollisionByKind
}>

/* Small stats block (cheap and useful for logs/metrics) */
export type RejectedStats = Readonly<{
  received: number
  valid: number
  invalid: number
  duplicates: number
  collisions: Readonly<{
    total: number
    constants: number
    names: number
  }>
}>

// New aggregated error payload (code: "definitionRejected")
type WithDefinitionRejected = Readonly<{
  // Human-readable lines (great for console / Grafana logs)
  details: readonly string[]
  // Structured report for tooling
  report: RejectedReport
  // Quick stats for dashboards
  stats: RejectedStats
}>

// Error payloads keyed by error code as a single source of truth
type ErrorPayloadByCode = BaseErrorPayloadByCode & {
  definitionRejected: WithDefinitionRejected
}

/** Derived union of all valid codes with no manual list */
export type EnumErrorCode = keyof ErrorPayloadByCode

/** Structured error context discriminated by `code` */
export type EnumErrorContext = {
  [K in EnumErrorCode]: Readonly<{ code: K } & ErrorPayloadByCode[K]>
}[EnumErrorCode]

/** Public enum object produced by createEnum */
export type EnumObject<T extends EnumValues> = Readonly<{
  values: T
  constants: EnumRecord<T>
  names: EnumRecord<T>

  is: (value: unknown) => value is EnumValue<T>
  parse: (value: unknown) => EnumValue<T>

  withValues: <R>(fn: (values: T) => R) => R
}>
