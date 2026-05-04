import { describe, expect, test } from 'bun:test'
import { createEnum, toConstKey, toNameKey } from '../../src'
import {
  assertFrozen,
  expectTextContainsAll,
  expectTextNotContainsAny,
  toText,
  zenumsExpect,
} from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for createEnum orchestration
// Purpose: keep tests intention-revealing and resistant to refactors

type CountRow = readonly [label: string, value: number]
type StatRow = readonly [label: string, stat: number, expected: number]

const DEFINITION_REJECTED_CODE = 'definitionRejected' as const
const INVALID_VALUE_CODE = 'invalidValue' as const

const OK_VALUES = Object.freeze(['foo-bar', 'stdout', 'API2'] as const)

const EXPECTED_CONSTANTS = Object.freeze({
  FOO_BAR: 'foo-bar',
  STDOUT: 'stdout',
  API2: 'API2',
} as const)

const EXPECTED_NAMES = Object.freeze({
  FooBar: 'foo-bar',
  Stdout: 'stdout',
  API2: 'API2',
} as const)

// Collisions by transforms (names/constants): foo-bar and foo_bar normalize to the same keys
const WITH_COLLISION = Object.freeze(['foo-bar', 'foo_bar'] as const)

// Duplicates are checked on raw input values (no normalization)
const WITH_DUPLICATE = Object.freeze(['foo', 'bar', 'foo'] as const)

// Mixed: invalid + duplicate + collision
const WITH_MIXED_ISSUES = Object.freeze([
  'foo',
  'foo',
  'foo-bar',
  'foo_bar',
  'a',
] as const)

const REJECTED_NEEDLES = Object.freeze([
  'Enum definition rejected.',
  '== Summary ==',
  '== Issues ==',
] as const)

const COLLISION_SECTION_NEEDLES = Object.freeze([
  '[collisions.constants]',
  '[collisions.names]',
] as const)

describe('createEnum', () => {
  test('returns a frozen enum object with values/constants/names and helpers', () => {
    const E = createEnum(OK_VALUES)

    // Top-level shape
    expect(E.values).toEqual(OK_VALUES)

    // Public records should expose the exact generated keys for this fixture
    expect({ ...E.constants }).toEqual(EXPECTED_CONSTANTS)
    expect({ ...E.names }).toEqual(EXPECTED_NAMES)

    // Runtime transforms should produce keys that exist in public records
    for (const value of OK_VALUES) {
      const constantKey = toConstKey(value)
      const nameKey = toNameKey(value)

      expect(Object.hasOwn(E.constants, constantKey)).toBe(true)
      expect(Object.hasOwn(E.names, nameKey)).toBe(true)
    }

    // Helpers contract
    expect(E.is('stdout')).toBe(true)
    expect(E.is('nope')).toBe(false)
    expect(E.is(123)).toBe(false)
    expect(E.is(null)).toBe(false)

    expect(E.parse('stdout')).toBe('stdout')

    // withValues contract: passes the typed tuple through
    const got = E.withValues(values => values)
    expect(got).toBe(E.values)

    // Security contract: prototype-less records (prevents "__proto__" pitfalls)
    expect(Object.getPrototypeOf(E.constants)).toBe(null)
    expect(Object.getPrototypeOf(E.names)).toBe(null)

    // Freeze expectations (stable public surface)
    const frozenBlocks = [E, E.values, E.constants, E.names] as const

    for (const block of frozenBlocks) {
      assertFrozen(block)
    }
  })

  describe('parse', () => {
    test('throws invalidValue with expected list for unknown string', () => {
      const E = createEnum(OK_VALUES)

      const e = zenumsExpect.mustThrow(
        () => E.parse('nope'),
        INVALID_VALUE_CODE,
        { receivedType: 'string', expected: OK_VALUES },
      )

      expect(e.context.value).toBe('nope')
    })

    test('throws invalidValue with received type for non-string input', () => {
      const E = createEnum(OK_VALUES)

      const e = zenumsExpect.mustThrow(() => E.parse(123), INVALID_VALUE_CODE, {
        receivedType: 'number',
        expected: OK_VALUES,
      })

      expect(e.context.value).toBe(123)
    })
  })

  describe('integration: prepareDefinition aggregation', () => {
    test('throws definitionRejected when there are collisions', () => {
      const e = zenumsExpect.mustThrow(
        () => createEnum(WITH_COLLISION),
        DEFINITION_REJECTED_CODE,
      )

      // Details must include collision sections (human-readable diagnostics)
      const text = toText(e.context.details)
      expectTextContainsAll(text, REJECTED_NEEDLES)
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)

      // Minimal contract: collisions must exist for both generated key kinds
      const gt0 = [
        ['collisions.constants', e.context.report.collisions.constants.length],
        ['collisions.names', e.context.report.collisions.names.length],
      ] as const satisfies readonly CountRow[]

      for (const [label, value] of gt0) {
        expect(value, label).toBeGreaterThan(0)
      }
    })

    test('throws definitionRejected when there are duplicates (and no collisions)', () => {
      const e = zenumsExpect.mustThrow(
        () => createEnum(WITH_DUPLICATE),
        DEFINITION_REJECTED_CODE,
      )

      const { report } = e.context

      expect(report.duplicates.length).toBeGreaterThan(0)

      const eq0 = [
        ['collisions.constants', report.collisions.constants.length],
        ['collisions.names', report.collisions.names.length],
      ] as const satisfies readonly CountRow[]

      for (const [label, value] of eq0) {
        expect(value, label).toBe(0)
      }

      const text = toText(e.context.details)
      expectTextContainsAll(text, REJECTED_NEEDLES)
      expectTextNotContainsAny(text, COLLISION_SECTION_NEEDLES)
    })

    test('throws definitionRejected for mixed issues and payload blocks are frozen', () => {
      const e = zenumsExpect.mustThrow(
        () => createEnum(WITH_MIXED_ISSUES),
        DEFINITION_REJECTED_CODE,
      )

      const { details, report, stats } = e.context
      const frozenBlocks = [details, report, stats] as const

      for (const block of frozenBlocks) {
        assertFrozen(block)
      }

      const gt0 = [
        ['invalid', report.invalid.length],
        ['duplicates', report.duplicates.length],
        ['collisions.constants', report.collisions.constants.length],
        ['collisions.names', report.collisions.names.length],
      ] as const satisfies readonly CountRow[]

      for (const [label, value] of gt0) {
        expect(value, label).toBeGreaterThan(0)
      }

      const statPairs = [
        ['invalid', stats.invalid, report.invalid.length],
        ['duplicates', stats.duplicates, report.duplicates.length],
        [
          'collisions.constants',
          stats.collisions.constants,
          report.collisions.constants.length,
        ],
        [
          'collisions.names',
          stats.collisions.names,
          report.collisions.names.length,
        ],
      ] as const satisfies readonly StatRow[]

      for (const [label, stat, expected] of statPairs) {
        expect(stat, `${label} stat`).toBe(expected)
      }

      const text = toText(details)
      expectTextContainsAll(text, REJECTED_NEEDLES)
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)
    })
  })
})
