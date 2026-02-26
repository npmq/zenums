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

const DEFINITION_REJECTED_CODE = 'definitionRejected' as const
const INVALID_VALUE_CODE = 'invalidValue' as const

const OK_VALUES = Object.freeze(['foo-bar', 'stdout', 'API2'] as const)

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
  'Stats:',
] as const)

const COLLISION_SECTION_NEEDLES = Object.freeze([
  'Collisions (constants):',
  'Collisions (names):',
] as const)

describe('createEnum', () => {
  test('returns a frozen enum object with values/constants/names and helpers', () => {
    const E = createEnum(OK_VALUES)

    // Top-level shape
    expect(E.values).toEqual(OK_VALUES)

    // Record mapping uses transforms; verify via transforms to avoid hardcoding too much
    for (const v of OK_VALUES) {
      expect(E.constants[toConstKey(v)]).toBe(v)
      expect(E.names[toNameKey(v)]).toBe(v)
    }

    // Helpers contract
    expect(E.is('stdout')).toBe(true)
    expect(E.is('nope')).toBe(false)

    expect(E.parse('stdout')).toBe('stdout')

    // withValues contract: passes the typed tuple through
    const got = E.withValues(vals => vals)
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
    test('throws invalidValue with expected list (preserves author order)', () => {
      const E = createEnum(OK_VALUES)

      const e = zenumsExpect.mustThrow(
        () => E.parse('nope'),
        INVALID_VALUE_CODE,
        { receivedType: 'string', expected: OK_VALUES },
      )

      expect(String(e.context.value)).toBe('nope')
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

      // minimal contract: collisions exist for both kinds
      const gt0 = [
        ['collisions.constants', e.context.report.collisions.constants.length],
        ['collisions.names', e.context.report.collisions.names.length],
      ] as const

      for (const [label, n] of gt0) {
        expect(n, label).toBeGreaterThan(0)
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
      ] as const

      for (const [label, n] of eq0) {
        expect(n, label).toBe(0)
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
      ] as const

      for (const [label, n] of gt0) {
        expect(n, label).toBeGreaterThan(0)
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
      ] as const

      for (const [label, stat, len] of statPairs) {
        expect(stat, `${label} stat`).toBe(len)
      }

      const text = toText(details)
      expectTextContainsAll(text, REJECTED_NEEDLES)
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)
    })
  })
})
