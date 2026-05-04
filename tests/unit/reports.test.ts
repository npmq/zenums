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
  '== Summary ==',
  'received     0',
  'valid        0',
  'invalid      0',
  'duplicates   0',
  'collisions   0',
] as const)

const ISSUES_NEEDLES_ABSENT_WHEN_EMPTY = Object.freeze([
  '== Issues ==',
  '[invalid]',
  '[duplicates]',
  '[collisions.constants]',
  '[collisions.names]',
] as const)

const SUMMARY_NEEDLES_WITH_ISSUES = Object.freeze([
  'Enum definition rejected.',
  '== Summary ==',
  'received     6',
  'valid        2',
  'invalid      3',
  'duplicates   2',
  'collisions   3 (constants: 2, names: 1)',
  '== Issues ==',
] as const)

const ISSUE_SECTION_NEEDLES = Object.freeze([
  '[invalid]',
  '[duplicates]',
  '[collisions.constants]',
  '[collisions.names]',
] as const)

// Assertion helper for stable ordering checks in rendered report text
function expectInOrder(text: string, needles: readonly string[]): void {
  let previousIndex = -1

  for (const needle of needles) {
    const index = text.indexOf(needle, previousIndex + 1)

    expect(index, needle).toBeGreaterThanOrEqual(0)
    expect(index, needle).toBeGreaterThan(previousIndex)

    previousIndex = index
  }
}

describe('reports', () => {
  describe('buildDefinitionRejectedDetails', () => {
    test('returns frozen summary-only lines when report has no issues', () => {
      const out = buildDefinitionRejectedDetails(EMPTY_REPORT, EMPTY_STATS)

      assertFrozen(out)

      const text = toText(out)

      expectTextContainsAll(text, SUMMARY_NEEDLES_EMPTY)
      expectTextNotContainsAny(text, ISSUES_NEEDLES_ABSENT_WHEN_EMPTY)
    })

    test('renders issues with deterministic ordering without mutating inputs', () => {
      const out = buildDefinitionRejectedDetails(
        REPORT_WITH_ISSUES,
        STATS_WITH_ISSUES,
      )

      assertFrozen(out)

      const text = toText(out)

      // Summary exists and includes formatted collision stats
      expectTextContainsAll(text, SUMMARY_NEEDLES_WITH_ISSUES)

      // Issue sections exist
      expectTextContainsAll(text, ISSUE_SECTION_NEEDLES)

      // Invalids are sorted by index, then code
      expectInOrder(text, [
        '[invalid]',
        '-> [0] "ABC"',
        '   code: capsOnly',
        '   message: ALL_CAPS without digits is not allowed',
        '-> [2] "a"',
        '   code: notMeaningful',
        '   message: must contain at least one letter',
        '-> [2] "x"',
        '   code: tooShort',
        '   message: minimum length is 2',
      ])

      // Duplicates are sorted by value
      expectInOrder(text, [
        '[duplicates]',
        '-> [1, 3] "a"',
        '   message: duplicate value',
        '-> [2, 5] "b"',
        '   message: duplicate value',
      ])

      // Constants collisions are sorted by key and sources are sorted too
      expectInOrder(text, [
        '[collisions.constants]',
        '-> "A"',
        '   sources:',
        '      - "a1"',
        '      - "a2"',
        '-> "B"',
        '   sources:',
        '      - "b1"',
        '      - "b2"',
      ])

      // Names collisions sources are sorted too
      expectInOrder(text, [
        '[collisions.names]',
        '-> "Z"',
        '   sources:',
        '      - "z1"',
        '      - "z2"',
      ])

      // Renderer must sort copies only; fixtures intentionally remain unsorted
      expect(REPORT_WITH_ISSUES.collisions.constants[0]?.key).toBe('B')
      expect(REPORT_WITH_ISSUES.collisions.constants[0]?.sources).toEqual([
        'b2',
        'b1',
      ])
    })
  })
})
