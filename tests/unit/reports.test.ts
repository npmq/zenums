import { describe, expect, test } from 'bun:test'
import { buildDefinitionRejectedDetails } from '../../src/internal/reports'
import type {
  CollisionItem,
  RejectedReport,
  RejectedStats,
} from '../../src/types'
import {
  assertFrozen,
  expectTextContainsAll,
  expectTextNotContainsAny,
  toText,
} from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for reports rendering
// Purpose: keep tests intention-revealing and resistant to refactors

const EMPTY_REPORT = Object.freeze({
  invalid: Object.freeze([]),
  duplicates: Object.freeze([]),
  collisions: Object.freeze({
    constants: Object.freeze([]),
    names: Object.freeze([]),
  }),
} satisfies RejectedReport)

const EMPTY_STATS = Object.freeze({
  received: 0,
  valid: 0,
  invalid: 0,
  duplicates: 0,
  collisions: Object.freeze({
    total: 0,
    constants: 0,
    names: 0,
  }),
} satisfies RejectedStats)

const COLLISIONS_WITH_ISSUES = Object.freeze({
  constants: Object.freeze([
    Object.freeze({
      key: 'B',
      sources: Object.freeze(['b2', 'b1']),
    }),
    Object.freeze({
      key: 'A',
      sources: Object.freeze(['a2', 'a1']),
    }),
  ] as const satisfies readonly CollisionItem[]),

  names: Object.freeze([
    Object.freeze({
      key: 'Z',
      sources: Object.freeze(['z2', 'z1']),
    }),
  ] as const satisfies readonly CollisionItem[]),
} as const)

const REPORT_WITH_ISSUES = Object.freeze({
  invalid: Object.freeze([
    // Intentionally unsorted (index desc / code desc)
    Object.freeze({ code: 'tooShort', index: 2, value: 'x', minLength: 2 }),
    Object.freeze({ code: 'capsOnly', index: 0, value: 'ABC' }),
    Object.freeze({ code: 'notMeaningful', index: 2, value: 'a' }),
  ]),
  duplicates: Object.freeze([
    // Intentionally unsorted by value
    Object.freeze({ value: 'b', indexes: Object.freeze([2, 5]) }),
    Object.freeze({ value: 'a', indexes: Object.freeze([1, 3]) }),
  ]),
  collisions: Object.freeze({
    constants: COLLISIONS_WITH_ISSUES.constants,
    names: COLLISIONS_WITH_ISSUES.names,
  }),
} satisfies RejectedReport)

const STATS_WITH_ISSUES = Object.freeze({
  received: 6,
  valid: 2,
  invalid: 3,
  duplicates: 2,
  collisions: Object.freeze({
    total: 3,
    constants: 2,
    names: 1,
  }),
} satisfies RejectedStats)

// Needle sets (keep expectations compact + intention-revealing)

const SUMMARY_NEEDLES_EMPTY = Object.freeze([
  'Enum definition rejected.',
  'Stats:',
  '  received: 0',
  '  valid: 0',
  '  invalid: 0',
  '  duplicates: 0',
  '  collisions: 0',
] as const)

const DETAILS_NEEDLES_ABSENT_WHEN_EMPTY = Object.freeze([
  'Details:',
  'Invalid:',
  'Duplicates:',
  'Collisions (constants):',
  'Collisions (names):',
] as const)

const SUMMARY_NEEDLES_WITH_ISSUES = Object.freeze([
  'Enum definition rejected.',
  'Stats:',
  'Details:',
] as const)

const COLLISION_SECTION_NEEDLES = Object.freeze([
  'Collisions (constants):',
  'Collisions (names):',
] as const)

describe('reports', () => {
  describe('buildDefinitionRejectedDetails', () => {
    test('returns frozen summary-only lines when report has no issues', () => {
      const out = buildDefinitionRejectedDetails(EMPTY_REPORT, EMPTY_STATS)

      assertFrozen(out)

      const text = toText(out)

      expectTextContainsAll(text, SUMMARY_NEEDLES_EMPTY)
      expectTextNotContainsAny(text, DETAILS_NEEDLES_ABSENT_WHEN_EMPTY)
    })

    test('renders details with deterministic ordering (invalids/duplicates/collisions)', () => {
      const out = buildDefinitionRejectedDetails(
        REPORT_WITH_ISSUES,
        STATS_WITH_ISSUES,
      )

      assertFrozen(out)

      const text = toText(out)

      // Summary exists
      expectTextContainsAll(text, SUMMARY_NEEDLES_WITH_ISSUES)

      // Invalids are sorted by index, then code
      const iCapsOnly = text.indexOf('  • [0] "ABC" — capsOnly:')
      const iNotMeaningful = text.indexOf('  • [2] "a" — notMeaningful:')
      const iTooShort = text.indexOf('  • [2] "x" — tooShort:')

      expect(iCapsOnly).toBeGreaterThanOrEqual(0)
      expect(iNotMeaningful).toBeGreaterThanOrEqual(0)
      expect(iTooShort).toBeGreaterThanOrEqual(0)

      expect(iCapsOnly).toBeLessThan(iNotMeaningful)
      expect(iNotMeaningful).toBeLessThan(iTooShort)

      // Duplicates are sorted by value
      const dA = text.indexOf('  • [1, 3] "a" — duplicate')
      const dB = text.indexOf('  • [2, 5] "b" — duplicate')

      expect(dA).toBeGreaterThanOrEqual(0)
      expect(dB).toBeGreaterThanOrEqual(0)
      expect(dA).toBeLessThan(dB)

      // Collisions sections exist and are ordered by key, sources sorted
      expectTextContainsAll(text, COLLISION_SECTION_NEEDLES)

      // constants: key A should appear before key B
      const cA = text.indexOf('  • "A" — collision (sources):')
      const cB = text.indexOf('  • "B" — collision (sources):')

      expect(cA).toBeGreaterThanOrEqual(0)
      expect(cB).toBeGreaterThanOrEqual(0)
      expect(cA).toBeLessThan(cB)

      // sources sorted within each key (a1 before a2, b1 before b2, z1 before z2)
      expect(text.indexOf('    • "a1"')).toBeLessThan(
        text.indexOf('    • "a2"'),
      )
      expect(text.indexOf('    • "b1"')).toBeLessThan(
        text.indexOf('    • "b2"'),
      )
      expect(text.indexOf('    • "z1"')).toBeLessThan(
        text.indexOf('    • "z2"'),
      )
    })
  })
})
