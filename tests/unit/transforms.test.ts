import { describe, expect, test } from 'bun:test'
import {
  toConstKey,
  toEnumKeys,
  toNameKey,
} from '../../src/internal/transforms'

// Contract fixtures: stable inputs/outputs for transforms
// Purpose: keep tests intention-revealing and resistant to refactors

const GOLDEN_CASES = [
  // kebab-case / snake_case
  { value: 'foo-bar', constantKey: 'FOO_BAR', nameKey: 'FooBar' },
  { value: 'utf-8', constantKey: 'UTF_8', nameKey: 'Utf8' },
  { value: 'foo_bar', constantKey: 'FOO_BAR', nameKey: 'FooBar' },

  // camel / pascal
  { value: 'fooBar', constantKey: 'FOO_BAR', nameKey: 'FooBar' },
  { value: 'one2Point', constantKey: 'ONE2_POINT', nameKey: 'One2Point' },
  { value: 'FooBar', constantKey: 'FOO_BAR', nameKey: 'FooBar' },
  { value: 'HttpRequest', constantKey: 'HTTP_REQUEST', nameKey: 'HttpRequest' },
  { value: 'HTTPRequest', constantKey: 'HTTP_REQUEST', nameKey: 'HttpRequest' },
  {
    value: 'XMLHttpRequest',
    constantKey: 'XML_HTTP_REQUEST',
    nameKey: 'XmlHttpRequest',
  },

  // digits inside
  { value: 'user1', constantKey: 'USER1', nameKey: 'User1' },
  { value: 'a2', constantKey: 'A2', nameKey: 'A2' },
  { value: 'z9', constantKey: 'Z9', nameKey: 'Z9' },

  // CAPS+digits fast-path (must remain unchanged)
  { value: 'R2D2', constantKey: 'R2D2', nameKey: 'R2D2' },
  { value: 'API2', constantKey: 'API2', nameKey: 'API2' },
  { value: 'AB12', constantKey: 'AB12', nameKey: 'AB12' },
  { value: 'HTTP2', constantKey: 'HTTP2', nameKey: 'HTTP2' },
] as const

const DIAGNOSTIC_VALUES = [
  'foo',
  'Foo',
  'foobar',
  'foo-bar',
  'foo_bar',
  'fooBar',
  'FooBar',
  'HttpRequest',
  'HTTPRequest',
  'XMLHttpRequest',
  'user1',
  'one2Point',
  'a2',
  'z9',
  'API2',
  'R2D2',
  'AB12',
  'HTTP2',
] as const

// CAPS+digits fast-path values are a subset of golden cases where no normalization happens
const capsDigitsOkValues = GOLDEN_CASES.flatMap(it => {
  return it.value === it.constantKey && it.value === it.nameKey
    ? ([it.value] as const)
    : ([] as const)
})

describe('transformations', () => {
  describe('golden cases', () => {
    test('toEnumKeys matches golden cases', () => {
      for (const item of GOLDEN_CASES) {
        expect(toEnumKeys(item.value)).toEqual({
          constantKey: item.constantKey,
          nameKey: item.nameKey,
        })
      }
    })
  })

  // Consistency: wrappers must match the pair function
  describe('consistency', () => {
    test('toConstKey / toNameKey are consistent with toEnumKeys', () => {
      for (const item of GOLDEN_CASES) {
        const keys = toEnumKeys(item.value)

        expect(toConstKey(item.value)).toBe(keys.constantKey)
        expect(toNameKey(item.value)).toBe(keys.nameKey)
      }
    })
  })

  // Shape rules: sanity constraints for generated keys (valid inputs only)
  describe('shape rules', () => {
    const reConst = /^[A-Z0-9_]+$/
    const reNameStart = /^[A-Z0-9]/

    test('const keys are uppercase + digits + underscores only (for valid inputs)', () => {
      for (const value of DIAGNOSTIC_VALUES) {
        const key = toConstKey(value)

        expect(key.length).toBeGreaterThan(0)
        expect(reConst.test(key)).toBe(true)
      }
    })

    test('name keys start with uppercase letter or digit (for valid inputs)', () => {
      for (const value of DIAGNOSTIC_VALUES) {
        const key = toNameKey(value)

        expect(key.length).toBeGreaterThan(0)
        expect(reNameStart.test(key)).toBe(true)
      }
    })

    test('toEnumKeys returns non-empty keys with expected character/shape constraints (for valid inputs)', () => {
      for (const value of DIAGNOSTIC_VALUES) {
        const keys = toEnumKeys(value)

        expect(keys.constantKey.length).toBeGreaterThan(0)
        expect(keys.nameKey.length).toBeGreaterThan(0)

        expect(reConst.test(keys.constantKey)).toBe(true)
        expect(reNameStart.test(keys.nameKey)).toBe(true)
      }
    })
  })

  describe('CAPS+digits fast-path', () => {
    test('CAPS+digits values remain unchanged for both keys', () => {
      expect(capsDigitsOkValues.length).toBeGreaterThan(0)

      for (const value of capsDigitsOkValues) {
        expect(toConstKey(value)).toBe(value)
        expect(toNameKey(value)).toBe(value)

        const both = toEnumKeys(value)
        expect(both.constantKey).toBe(value)
        expect(both.nameKey).toBe(value)
      }
    })
  })

  // Collision-equivalence: demonstrate “same key” scenarios without re-testing checkCollisions
  describe('collision-equivalence hints', () => {
    test('different inputs can normalize to the same CONSTANTS key', () => {
      const groups = [
        ['foo-bar', 'foo_bar', 'fooBar', 'FooBar'], // -> FOO_BAR
        ['HttpRequest', 'HTTPRequest'], // -> HTTP_REQUEST
      ] as const

      for (const group of groups) {
        const [first, ...rest] = group
        const expected = toConstKey(first)

        for (const value of rest) {
          expect(toConstKey(value)).toBe(expected)
        }
      }
    })

    test('different inputs can normalize to the same NAMES key', () => {
      const groups = [
        ['foo', 'Foo'], // -> Foo
        ['foo-bar', 'foo_bar', 'fooBar', 'FooBar'], // -> FooBar
        ['HttpRequest', 'HTTPRequest'], // -> HttpRequest
      ] as const

      for (const group of groups) {
        const [first, ...rest] = group
        const expected = toNameKey(first)

        for (const value of rest) {
          expect(toNameKey(value)).toBe(expected)
        }
      }
    })
  })
})
