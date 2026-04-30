import { describe, expect, test } from 'bun:test'
import type { EnumErrorContext } from '../../src'
import { prepareDefinition } from '../../src/internal/rejected'
import {
  assertFrozen,
  expectTextContainsAll,
  expectTextNotContainsAny,
  toText,
} from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for prepareDefinition aggregation
// Purpose: keep tests intention-revealing and resistant to refactors

const DEFINITION_REJECTED_CODE = 'definitionRejected' as const
const VALID_OK = Object.freeze(['foo', 'bar', 'bazQux', 'API2'] as const)
const WITH_DUPLICATE = Object.freeze(['foo', 'bar', 'foo'] as const)

// Collisions by transforms (names/constants): foo-bar and foo_bar normalize to the same keys
const WITH_COLLISION = Object.freeze(['foo-bar', 'foo_bar'] as const)

// Mixed: invalid + duplicate + collision at once
// Notes:
// - 'a' is invalid as tooShort because length gate runs before semantic checks
// - duplicates: 'foo' repeats
// - collisions: foo-bar + foo_bar
const WITH_MIXED_ISSUES = Object.freeze([
  'foo',
  'foo',
  'foo-bar',
  'foo_bar',
  'a',
] as const)

// Local tiny helpers: domain-level intent (avoid string duplication noise)

type DefinitionRejectedCtx = Extract<
  EnumErrorContext,
  { code: typeof DEFINITION_REJECTED_CODE }
>

type CountRule = 'eq0' | 'gt0'

const COLLISION_SECTION_NEEDLES = Object.freeze([
  'Collisions (constants):',
  'Collisions (names):',
] as const)

const DUPLICATES_ONLY_NEEDLES = Object.freeze(['Duplicates:'] as const)

const STATS_NEEDLES = Object.freeze([
  'Enum definition rejected.',
  'Stats:',
  'Details:',
] as const)

const MIXED_DETAILS_NEEDLES = Object.freeze([
  'Invalid:',
  'Duplicates:',
  ...COLLISION_SECTION_NEEDLES,
  '— collision (sources):',
  '"FOO_BAR"',
  '"FooBar"',
  '"foo-bar"',
  '"foo_bar"',
] as const)

function expectRejected(
  out: ReturnType<typeof prepareDefinition>,
): DefinitionRejectedCtx {
  expect(out.ok).toBe(false)

  if (out.ok) {
    expect.unreachable('Expected ok:false')
  }

  expect(out.error.code).toBe(DEFINITION_REJECTED_CODE)

  return out.error
}

function expectCounts(
  items: readonly (readonly [label: string, count: number, rule: CountRule])[],
): void {
  for (const [label, count, rule] of items) {
    if (rule === 'gt0') {
      expect(count, label).toBeGreaterThan(0)

      continue
    }

    expect(count, label).toBe(0)
  }
}

describe('rejected', () => {
  describe('prepareDefinition', () => {
    test('returns ok:true when there are no issues', () => {
      const out = prepareDefinition(VALID_OK)

      expect(out).toEqual({ ok: true })
      assertFrozen(out)
    })

    test('returns ok:false with definitionRejected payload when there are issues', () => {
      const ctx = expectRejected(prepareDefinition(WITH_MIXED_ISSUES))

      // Core payload blocks should be present and frozen
      const coreFrozenBlocks = [
        ctx.details,
        ctx.report,
        ctx.report.invalid,
        ctx.report.duplicates,
        ctx.report.collisions,
        ctx.report.collisions.constants,
        ctx.report.collisions.names,
        ctx.stats,
        ctx.stats.collisions,
      ] as const

      for (const block of coreFrozenBlocks) {
        assertFrozen(block)
      }

      const text = toText(ctx.details)
      expectTextContainsAll(text, STATS_NEEDLES)

      // Report: contains all sections
      const sections = [
        ['invalid', ctx.report.invalid],
        ['duplicates', ctx.report.duplicates],
        ['collisions.constants', ctx.report.collisions.constants],
        ['collisions.names', ctx.report.collisions.names],
      ] as const

      for (const [label, arr] of sections) {
        expect(Array.isArray(arr), label).toBe(true)
      }

      // Stats are consistent with report lengths
      const statLengths = [
        ['invalid', ctx.stats.invalid, ctx.report.invalid.length],
        ['duplicates', ctx.stats.duplicates, ctx.report.duplicates.length],
        [
          'collisions.constants',
          ctx.stats.collisions.constants,
          ctx.report.collisions.constants.length,
        ],
        [
          'collisions.names',
          ctx.stats.collisions.names,
          ctx.report.collisions.names.length,
        ],
      ] as const

      for (const [label, stat, len] of statLengths) {
        expect(stat, `${label} stat`).toBe(len)
      }

      expect(ctx.stats.collisions.total, 'collisions.total stat').toBe(
        ctx.report.collisions.constants.length +
          ctx.report.collisions.names.length,
      )

      // Mixed scenario expectations:
      // - at least 1 invalid (the 'a')
      // - at least 1 duplicate ('foo')
      // - collisions for both kinds (foo-bar vs foo_bar)
      expectCounts([
        ['invalid', ctx.report.invalid.length, 'gt0'],
        ['duplicates', ctx.report.duplicates.length, 'gt0'],
        ['collisions.constants', ctx.report.collisions.constants.length, 'gt0'],
        ['collisions.names', ctx.report.collisions.names.length, 'gt0'],
      ])

      expect(ctx.report.invalid).toContainEqual({
        code: 'tooShort',
        index: 4,
        value: 'a',
        minLength: 2,
      })

      expect(ctx.report.duplicates).toContainEqual({
        value: 'foo',
        indexes: [0, 1],
      })

      // Details: should mention sections and include key collision wording
      expectTextContainsAll(text, MIXED_DETAILS_NEEDLES)
    })

    test('does not include collisions when only duplicates exist', () => {
      const ctx = expectRejected(prepareDefinition(WITH_DUPLICATE))

      expectCounts([
        ['duplicates', ctx.report.duplicates.length, 'gt0'],
        ['collisions.constants', ctx.report.collisions.constants.length, 'eq0'],
        ['collisions.names', ctx.report.collisions.names.length, 'eq0'],
      ])

      const text = toText(ctx.details)
      expectTextContainsAll(text, DUPLICATES_ONLY_NEEDLES)
      expectTextNotContainsAny(text, COLLISION_SECTION_NEEDLES)
    })

    test('includes collisions when only collisions exist', () => {
      const ctx = expectRejected(prepareDefinition(WITH_COLLISION))

      expectCounts([
        ['invalid', ctx.report.invalid.length, 'eq0'],
        ['duplicates', ctx.report.duplicates.length, 'eq0'],
        ['collisions.constants', ctx.report.collisions.constants.length, 'gt0'],
        ['collisions.names', ctx.report.collisions.names.length, 'gt0'],
      ])

      const text = toText(ctx.details)
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)
    })
  })
})
