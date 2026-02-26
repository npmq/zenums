import { throwEnumError } from '../errors'
import type { CollisionItem, EnumErrorContext, EnumKeyKind } from '../types'
import { invariant } from './invariant'

// Assertion signature for createEnum input validation
type ValidateEnum = (
  values: unknown,
) => asserts values is readonly [string, ...string[]]

// Collision check signature for generated keys
type CheckCollisions = (
  kind: EnumKeyKind,
  keyMap: ReadonlyMap<string, readonly string[]>,
) => void

// Centralized regexes for validator rules (single source of truth)
const RE = Object.freeze({
  allowedChars: /^[A-Za-z0-9_-]+$/,
  firstInvalidChar: /[^A-Za-z0-9_-]/,

  edgeSeparator: /^[-_]|[-_]$/,
  doubleSeparators: /--|__/,

  startsWithDigit: /^\d/,
  digitsOnly: /^\d+$/,
  hasDigit: /\d/,

  hasUpper: /[A-Z]/,
  hasLetter: /[A-Za-z]/,
  capsOnly: /^[A-Z]+$/,

  separatorsGlobal: /[-_]/g,
})

// Domain separators used by naming rules
const SEPARATORS = {
  dash: '-',
  underscore: '_',
} as const

// Minimum allowed length for enum values
const MIN_LENGTH = 2 as const

// Validates container shape and enforces non-empty array semantics
function assertNonEmptyArray(
  values: unknown,
): asserts values is readonly [unknown, ...unknown[]] {
  if (!Array.isArray(values)) {
    throwEnumError({ code: 'notArray', receivedType: typeof values })
  }

  if (values.length === 0) {
    throwEnumError({ code: 'emptyArray' })
  }
}

// --- Aggregation types (no throw)

type IndexedCtx = Extract<EnumErrorContext, { index: number }>
type DuplicateCtx = Extract<IndexedCtx, { code: 'duplicate' }>
type RejectedInvalidItem = Exclude<IndexedCtx, DuplicateCtx>

/** Aggregated stage-2 output for definitionRejected: valid values + structured rejections */
export type CollectedValues = Readonly<{
  received: number
  valid: readonly string[]
  invalid: readonly RejectedInvalidItem[]
  duplicates: readonly Readonly<{ value: string; indexes: readonly number[] }>[]
}>

// Narrows invalid payload to the exact union member for type-safe error contexts
function invalid<K extends RejectedInvalidItem['code']>(
  ctx: Extract<RejectedInvalidItem, { code: K }>,
): RejectedInvalidItem {
  return ctx
}

// Result shape for non-throwing value validation
type EnumValueOk = Readonly<{ ok: true; value: string }>
type EnumValueErr = Readonly<{ ok: false; item: RejectedInvalidItem }>
type EnumValueCheckResult = EnumValueOk | EnumValueErr

// Validates a single value and returns a structured rejection instead of throwing
function validateEnumValue(
  value: unknown,
  index: number,
): EnumValueCheckResult {
  // Type gate
  if (typeof value !== 'string') {
    return {
      ok: false,
      item: invalid({ code: 'notString', index, receivedType: typeof value }),
    }
  }

  // Length gate
  if (value.length < MIN_LENGTH) {
    return {
      ok: false,
      item: invalid({
        code: 'tooShort',
        index,
        value,
        minLength: MIN_LENGTH,
      }),
    }
  }

  // Allowed charset
  if (!RE.allowedChars.test(value)) {
    const match = RE.firstInvalidChar.exec(value)

    // Invariant: if allowedChars fails, firstInvalidChar must find a match
    invariant(
      match !== null,
      'validators.validateEnumValue: RE.allowedChars and RE.firstInvalidChar are out of sync',
    )

    const invalidChar = match?.[0] ?? '?'
    const position = typeof match?.index === 'number' ? match.index : undefined

    return {
      ok: false,
      item: invalid({
        code: 'invalidChars',
        index,
        value,
        invalidChar,
        position,
      }),
    }
  }

  // Separator style rules
  const hasDash = value.includes(SEPARATORS.dash)
  const hasUnderscore = value.includes(SEPARATORS.underscore)

  if (hasDash && hasUnderscore) {
    return {
      ok: false,
      item: invalid({ code: 'mixedSeparatorStyles', index, value }),
    }
  }

  if (RE.edgeSeparator.test(value) || RE.doubleSeparators.test(value)) {
    return {
      ok: false,
      item: invalid({ code: 'badSeparatorPlacement', index, value }),
    }
  }

  // Numeric-only is forbidden even with separators: "1-2", "22_44"
  const withoutSeparators =
    hasDash || hasUnderscore ? value.replace(RE.separatorsGlobal, '') : value

  if (RE.digitsOnly.test(withoutSeparators)) {
    return {
      ok: false,
      item: invalid({ code: 'numericOnly', index, value }),
    }
  }

  // Values must not start with a digit
  if (RE.startsWithDigit.test(value)) {
    return {
      ok: false,
      item: invalid({ code: 'startsWithDigit', index, value }),
    }
  }

  // If kebab/snake, enforce lowercase
  if ((hasDash || hasUnderscore) && RE.hasUpper.test(value)) {
    return {
      ok: false,
      item: invalid({ code: 'separatedMustBeLowercase', index, value }),
    }
  }

  // Must contain at least one letter
  if (!RE.hasLetter.test(value)) {
    return {
      ok: false,
      item: invalid({ code: 'notMeaningful', index, value }),
    }
  }

  // Forbid ALL_CAPS without digits, allow API2 and R2D2
  if (RE.capsOnly.test(value) && !RE.hasDigit.test(value)) {
    return {
      ok: false,
      item: invalid({ code: 'capsOnly', index, value }),
    }
  }

  return { ok: true, value }
}

// Builds duplicates list from value -> indexes map (sorted for stable logs)
function buildDuplicates(
  indexMap: ReadonlyMap<string, readonly number[]>,
): readonly Readonly<{ value: string; indexes: readonly number[] }>[] {
  return Object.freeze(
    Array.from(indexMap.entries())
      .filter(([, idx]) => idx.length > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, idx]) => {
        return Object.freeze({ value, indexes: Object.freeze([...idx]) })
      }),
  )
}

/** Collects valid values, invalid items, and duplicates without throwing (except shape errors) */
export const collectEnumValues = (values: unknown): CollectedValues => {
  assertNonEmptyArray(values)

  const received = values.length
  const invalid: RejectedInvalidItem[] = []
  const valid: string[] = []
  const indexMap = new Map<string, number[]>()

  for (const [index, raw] of values.entries()) {
    const res = validateEnumValue(raw, index)

    if (!res.ok) {
      invalid.push(res.item)

      continue
    }

    const value = res.value
    valid.push(value)

    const arr = indexMap.get(value)
    if (arr) {
      arr.push(index)

      continue
    }

    indexMap.set(value, [index])
  }

  const duplicates = buildDuplicates(indexMap)

  return Object.freeze({
    received,
    valid: Object.freeze(valid),
    invalid: Object.freeze(invalid),
    duplicates,
  })
}

// Asserts a single value is valid and narrows unknown -> string
function assertEnumValue(
  value: unknown,
  index: number,
): asserts value is string {
  const res = validateEnumValue(value, index)

  if (!res.ok) {
    throwEnumError(res.item)
  }
}

/** Validates enum values and raw uniqueness without normalizing inputs */
export const validateEnum: ValidateEnum = (values: unknown) => {
  // Validate container shape before touching elements
  assertNonEmptyArray(values)

  // Track raw strings exactly (author intent) and reject exact duplicates
  const seen = new Set<string>()

  for (const [index, value] of values.entries()) {
    assertEnumValue(value, index)

    if (seen.has(value)) {
      throwEnumError({ code: 'duplicate', index, value })
    }

    seen.add(value)
  }
}

// Collects collisions deterministically (sorted keys + de-duped sources)
function collectCollisionsFromMap(
  keyMap: ReadonlyMap<string, readonly string[]>,
): readonly CollisionItem[] {
  const collisions: CollisionItem[] = []

  const entries = Array.from(keyMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  )

  for (const [key, sourcesRaw] of entries) {
    const sources = Object.freeze(
      Array.from(new Set(sourcesRaw)).sort((a, b) => a.localeCompare(b)),
    )

    if (sources.length > 1) {
      collisions.push(Object.freeze({ key, sources }))
    }
  }

  return Object.freeze(collisions)
}

// Renders collision diagnostics with stable ordering for logs and tests
function buildCollisionDetails(
  collisions: readonly CollisionItem[],
): readonly string[] {
  const details: string[] = []

  for (const c of collisions) {
    details.push(`Key '${c.key}' is produced by:`)

    for (const s of c.sources) {
      details.push(`  • '${s}'`)
    }

    details.push('')
  }

  while (details.length > 0 && details[details.length - 1] === '') {
    details.pop()
  }

  return Object.freeze(details)
}

/** Ensures generated keys are unique for the given kind and throws with deterministic diagnostics */
export const checkCollisions: CheckCollisions = (kind, keyMap) => {
  const collisions = collectCollisionsFromMap(keyMap)

  if (collisions.length === 0) {
    return
  }

  const details = buildCollisionDetails(collisions)

  throwEnumError({
    code: 'collision',
    kind,
    details,
    collisions,
    count: collisions.length,
  })
}

/** Collects collisions deterministically for reporting and definitionRejected aggregation */
export const collectCollisions = (
  keyMap: ReadonlyMap<string, readonly string[]>,
): readonly CollisionItem[] => {
  return collectCollisionsFromMap(keyMap)
}
