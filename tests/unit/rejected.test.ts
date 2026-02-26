import { describe, expect, test } from 'bun:test'
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
// - 'a' should be invalid under "notMeaningful" style rules (as in your reports test fixtures)
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
  "Key '",
  'is produced by:',
] as const)

describe('rejected', () => {
  describe('prepareDefinition', () => {
    test('returns ok:true when there are no issues', () => {
      const out = prepareDefinition(VALID_OK)

      expect(out).toEqual({ ok: true })
      assertFrozen(out)
    })

    test('returns ok:false with definitionRejected payload when there are issues', () => {
      const out = prepareDefinition(WITH_MIXED_ISSUES)

      expect(out.ok).toBe(false)
      if (out.ok) {
        expect.unreachable('Expected ok:false')
      }

      const ctx = out.error
      expect(ctx.code).toBe(DEFINITION_REJECTED_CODE)

      // Core payload blocks should be present and frozen
      const coreFrozenBlocks = [ctx.details, ctx.report, ctx.stats]

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

      // Mixed scenario expectations:
      // - at least 1 invalid (the 'a')
      // - at least 1 duplicate ('foo')
      // - collisions for both kinds (foo-bar vs foo_bar)
      const mixedGt0 = [
        ['invalid', ctx.report.invalid.length],
        ['duplicates', ctx.report.duplicates.length],
        ['collisions.constants', ctx.report.collisions.constants.length],
        ['collisions.names', ctx.report.collisions.names.length],
      ] as const

      for (const [label, n] of mixedGt0) {
        expect(n, label).toBeGreaterThan(0)
      }

      // Details: should mention sections and include key collision wording
      expectTextContainsAll(text, MIXED_DETAILS_NEEDLES)
    })

    test('does not include collisions when only duplicates exist', () => {
      const out = prepareDefinition(WITH_DUPLICATE)

      expect(out.ok).toBe(false)
      if (out.ok) {
        expect.unreachable('Expected ok:false')
      }

      const ctx = out.error
      expect(ctx.code).toBe(DEFINITION_REJECTED_CODE)

      const onlyDupExpects = [
        ['duplicates', ctx.report.duplicates.length, 'gt0'],
        ['collisions.constants', ctx.report.collisions.constants.length, 'eq0'],
        ['collisions.names', ctx.report.collisions.names.length, 'eq0'],
      ] as const

      for (const [label, n, rule] of onlyDupExpects) {
        if (rule === 'gt0') {
          expect(n, label).toBeGreaterThan(0)

          continue
        }

        expect(n, label).toBe(0)
      }

      const text = toText(ctx.details)
      expectTextContainsAll(text, DUPLICATES_ONLY_NEEDLES)
      expectTextNotContainsAny(text, COLLISION_SECTION_NEEDLES)
    })

    test('includes collisions when only collisions exist', () => {
      const out = prepareDefinition(WITH_COLLISION)

      expect(out.ok).toBe(false)
      if (out.ok) {
        expect.unreachable('Expected ok:false')
      }

      const ctx = out.error
      expect(ctx.code).toBe(DEFINITION_REJECTED_CODE)

      const onlyColExpects = [
        ['invalid', ctx.report.invalid.length, 'eq0'],
        ['duplicates', ctx.report.duplicates.length, 'eq0'],
        ['collisions.constants', ctx.report.collisions.constants.length, 'gt0'],
        ['collisions.names', ctx.report.collisions.names.length, 'gt0'],
      ] as const

      for (const [label, n, rule] of onlyColExpects) {
        if (rule === 'gt0') {
          expect(n, label).toBeGreaterThan(0)

          continue
        }

        expect(n, label).toBe(0)
      }

      const text = toText(ctx.details)
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)
    })
  })
})
