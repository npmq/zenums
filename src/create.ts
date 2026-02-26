import { throwEnumError } from './errors'
import { prepareDefinition } from './internal/rejected'
import { toEnumKeys } from './internal/transforms'
import type { EnumObject, EnumRecord, EnumValue, EnumValues } from './types'

// Creates a prototype-less dictionary to avoid "__proto__" and similar pitfalls
function makeDict<V extends string>(): Record<string, V> {
  return Object.create(null) as Record<string, V>
}

// Creates both builders with proper value narrowing for a single typed boundary
function makeEnumBuilders<T extends EnumValues>(): Readonly<{
  constantsBuilder: Record<string, EnumValue<T>>
  namesBuilder: Record<string, EnumValue<T>>
}> {
  return Object.freeze({
    constantsBuilder: makeDict<EnumValue<T>>(),
    namesBuilder: makeDict<EnumValue<T>>(),
  })
}

// Adds the generated keys for one value into both builders
// Contract: builders are internal-only; final records are frozen at the end
function addPair<T extends EnumValues>(
  constantsBuilder: Record<string, EnumValue<T>>,
  namesBuilder: Record<string, EnumValue<T>>,
  constantKey: string,
  nameKey: string,
  value: EnumValue<T>,
): void {
  constantsBuilder[constantKey] = value
  namesBuilder[nameKey] = value
}

// Freezes both records and narrows them to EnumRecord at a single type boundary
function freezeEnumRecords<T extends EnumValues>(
  constantsBuilder: Record<string, EnumValue<T>>,
  namesBuilder: Record<string, EnumValue<T>>,
): Readonly<{ constants: EnumRecord<T>; names: EnumRecord<T> }> {
  return Object.freeze({
    constants: Object.freeze(constantsBuilder) as EnumRecord<T>,
    names: Object.freeze(namesBuilder) as EnumRecord<T>,
  })
}

// Single public-boundary cast for the frozen runtime values list
// Contract: valuesList is derived from the original input tuple (no normalization)
function asEnumValues<T extends EnumValues>(
  valuesList: readonly EnumValue<T>[],
): T {
  return valuesList as unknown as T
}

// --- Entry helpers (pure factories; never mutate inputs)

function makeIs<T extends EnumValues>(
  valueSet: ReadonlySet<string>,
): (value: unknown) => value is EnumValue<T> {
  return (value: unknown): value is EnumValue<T> => {
    return typeof value === 'string' && valueSet.has(value)
  }
}

function makeParse<T extends EnumValues>(
  is: (value: unknown) => value is EnumValue<T>,
  expectedValues: readonly string[],
): (value: unknown) => EnumValue<T> {
  return (value: unknown): EnumValue<T> => {
    if (is(value)) {
      return value
    }

    throwEnumError({
      code: 'invalidValue',
      value,
      receivedType: typeof value,
      expected: expectedValues,
    })
  }
}

function makeWithValues<T extends EnumValues>(values: T) {
  return function withValues<R>(fn: (vals: T) => R): R {
    return fn(values)
  }
}

/**
 * Creates a validated enum-like object with typed values, constants and names
 * createEnum is an orchestrator: all validation/aggregation lives in prepareDefinition()
 * Does not normalize input values to preserve author intent
 */
export const createEnum = <const T extends EnumValues>(
  input: T,
): EnumObject<T> => {
  // Single validation gate (shape fail-fast + value-level aggregation)
  const definition = prepareDefinition(input)

  if (!definition.ok) {
    throwEnumError(definition.error)
  }

  // Freeze a runtime list once; keep author order; used by values/is/parse
  const valuesList = Object.freeze([...input]) as readonly EnumValue<T>[]
  const valueSet = new Set<string>(valuesList)

  // Public-boundary cast to keep tuple typing on .values
  const values = asEnumValues<T>(valuesList)

  // Build records (no extra validation here)
  const { constantsBuilder, namesBuilder } = makeEnumBuilders<T>()

  for (const value of valuesList) {
    const { constantKey, nameKey } = toEnumKeys(value)

    addPair(constantsBuilder, namesBuilder, constantKey, nameKey, value)
  }

  const { constants, names } = freezeEnumRecords(constantsBuilder, namesBuilder)

  // Build methods (pure, deterministic)
  const is = makeIs<T>(valueSet)
  const parse = makeParse<T>(is, valuesList)
  const withValues = makeWithValues(values)

  return Object.freeze({
    values,
    constants,
    names,
    is,
    parse,
    withValues,
  })
}
