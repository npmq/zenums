import { describe, expect, test } from 'bun:test'
import {
  sorted,
  sortedStrings,
  sortedUniqBy,
} from '../../src/internal/determinism'
import { assertFrozen } from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for determinism helpers
// Purpose: keep tests intention-revealing and resistant to refactors

const NUMBERS_INPUT = Object.freeze([3, 1, 2] as const)
const NUMBERS_SORTED = [1, 2, 3] as const
const NUMBERS_INPUT_UNCHANGED = [3, 1, 2] as const

const STRINGS_INPUT = Object.freeze(['b', 'a', 'c'] as const)
const STRINGS_SORTED = ['a', 'b', 'c'] as const
const STRINGS_INPUT_UNCHANGED = ['b', 'a', 'c'] as const

const UNIQ_BY_ID_INPUT = Object.freeze([
  { id: 'b', v: 1 },
  { id: 'a', v: 10 },
  { id: 'b', v: 999 },
  { id: 'c', v: 2 },
  { id: 'a', v: 777 },
] as const)

const UNIQ_BY_ID_SORTED = [
  { id: 'a', v: 10 },
  { id: 'b', v: 1 },
  { id: 'c', v: 2 },
] as const

// Shared invariant for determinism helpers: frozen copy semantics + no input mutation
function expectFrozenCopy<T>(
  out: readonly T[],
  input: readonly T[],
  expected: readonly T[],
  inputUnchanged: readonly T[],
): void {
  expect(out).toEqual(expected)
  expect(out).not.toBe(input)
  assertFrozen(out)
  expect(input).toEqual(inputUnchanged)
}

describe('determinism helpers', () => {
  // sorted contract: returns a new frozen array with deterministic ordering
  describe('sorted', () => {
    test('returns a new frozen array and does not mutate input', () => {
      const out = sorted(NUMBERS_INPUT, (a, b) => a - b)

      expectFrozenCopy(
        out,
        NUMBERS_INPUT,
        NUMBERS_SORTED,
        NUMBERS_INPUT_UNCHANGED,
      )
    })
  })

  // sortedStrings contract: localeCompare ordering with frozen copy semantics
  describe('sortedStrings', () => {
    test('sorts strings with localeCompare, returns a new frozen array, does not mutate input', () => {
      const out = sortedStrings(STRINGS_INPUT)

      expectFrozenCopy(
        out,
        STRINGS_INPUT,
        STRINGS_SORTED,
        STRINGS_INPUT_UNCHANGED,
      )
    })
  })

  // sortedUniqBy contract: keep first by key then sort deterministically, return frozen copy
  describe('sortedUniqBy', () => {
    test('keeps first occurrence by key and returns frozen sorted output', () => {
      const out = sortedUniqBy(
        UNIQ_BY_ID_INPUT,
        it => it.id,
        (x, y) => x.id.localeCompare(y.id),
      )

      expect(out).toEqual(UNIQ_BY_ID_SORTED)
      expect(out).not.toBe(UNIQ_BY_ID_INPUT)
      assertFrozen(out)

      // Input not mutated (length is a simple, intention-revealing check here)
      expect(UNIQ_BY_ID_INPUT.length).toBe(5)
    })
  })
})
