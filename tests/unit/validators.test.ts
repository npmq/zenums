import { describe, test } from 'bun:test'
import type { EnumErrorCode } from '../../src'
import { validateEnum } from '../../src/internal/validators'
import { caseOf, type ValuesCase, zenumsExpect } from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for validateEnum
// Purpose: keep tests intention-revealing and resistant to refactors

type InvalidCases = Readonly<{
  code: EnumErrorCode
  cases: ValuesCase
}>

type InvalidChars = Readonly<{
  value: string
  invalidChar: string
}>

const CAPS_DIGITS_OK = caseOf('R2D2', 'API2', 'AB12')
const NOT_ARRAY_INPUTS = ['nope', {}, () => {}, 123, null, undefined] as const
const NON_STRING_ELEMENTS = [123, true, null, undefined] as const

const VALID_CASES = [
  caseOf('foo-bar', 'utf-8'),
  caseOf('foo_bar', 'user1'),
  caseOf('fooBar', 'one2Point'),
  caseOf('FooBar', 'HttpRequest'),
  CAPS_DIGITS_OK,
  caseOf('a2', 'z9'),
] as const satisfies readonly ValuesCase[]

const SINGLE_VALUES = {
  TOO_SHORT: caseOf('a'),
  MIN_OK: caseOf('aa', 'a0', 'k2'),
} as const

// invalidChars: each case isolates the intended invalidChar (stable expectations)
const INVALID_CHARS_DETAILS = [
  // obvious ASCII forbidden chars
  { value: 'foo@bar', invalidChar: '@' },
  { value: 'foo bar', invalidChar: ' ' },
  { value: 'test!value', invalidChar: '!' },

  // dots are always forbidden (and clearly reported as '.')
  { value: '.foo', invalidChar: '.' },
  { value: 'foo.', invalidChar: '.' },
  { value: '..foo', invalidChar: '.' },
  { value: 'foo..', invalidChar: '.' },

  // non-ASCII letter without earlier forbidden chars (stable invalidChar)
  { value: 'abБ', invalidChar: 'Б' },
] as const satisfies readonly InvalidChars[]

const INVALID_CASES = {
  MIXED_SEPARATOR: {
    code: 'mixedSeparatorStyles',
    cases: caseOf('foo-_bar', 'foo_bar-baz', 'test-value_2'),
  },
  BAD_SEPARATOR: {
    code: 'badSeparatorPlacement',
    cases: caseOf(
      '-foo',
      'foo-',
      '_bar',
      'bar_',
      '--test',
      'test__',
      'foo--bar',
      'foo__bar',
    ),
  },
  NUMERIC_ONLY: {
    code: 'numericOnly',
    cases: caseOf('123', '1-2', '22_44', '9_9', '0-0'),
  },
  STARTS_WITH_DIGIT: {
    code: 'startsWithDigit',
    cases: caseOf('1a', '2FA', '9foo', '0bar'),
  },
  SEPARATED_LOWERCASE: {
    code: 'separatedMustBeLowercase',
    cases: caseOf('Foo-bar', 'foo-Bar', 'FOO-bar', 'foo_Bar', 'foo_BAZ'),
  },
  CAPS_ONLY: {
    code: 'capsOnly',
    cases: caseOf('FOO', 'HTTP', 'API'),
  },
} as const satisfies Record<string, InvalidCases>

const INVALID_CASE_KEYS = Object.keys(INVALID_CASES) as Array<
  keyof typeof INVALID_CASES
>

// validateEnum checks raw input duplicates only; key-collisions are handled elsewhere
const DUPLICATE_CASES = [
  ['foo', 'foo'],
  ['foO', 'foO'],
  ['API2', 'API2'],
] as const satisfies readonly [string, string][]

describe('validateEnum', () => {
  describe('input shape', () => {
    test('rejects non-array input', () => {
      for (const value of NOT_ARRAY_INPUTS) {
        zenumsExpect.mustThrow(
          () => validateEnum(value as unknown),
          'notArray',
          { receivedType: typeof value },
        )
      }
    })

    test('rejects empty array', () => {
      zenumsExpect.mustThrow(() => validateEnum([]), 'emptyArray')
    })
  })

  describe('elements', () => {
    test('rejects non-string element', () => {
      for (const value of NON_STRING_ELEMENTS) {
        zenumsExpect.mustThrow(
          () => validateEnum(['ok', value] as unknown),
          'notString',
          { index: 1, receivedType: typeof value },
        )
      }
    })
  })

  describe('value rules', () => {
    test('rejects too short values', () => {
      for (const value of SINGLE_VALUES.TOO_SHORT) {
        zenumsExpect.mustThrow(() => validateEnum([value]), 'tooShort', {
          index: 0,
          value,
          minLength: 2,
        })
      }
    })

    test('invalidChars reports invalidChar', () => {
      for (const item of INVALID_CHARS_DETAILS) {
        zenumsExpect.mustThrow(
          () => validateEnum([item.value]),
          'invalidChars',
          {
            index: 0,
            value: item.value,
            invalidChar: item.invalidChar,
          },
        )
      }
    })

    for (const name of INVALID_CASE_KEYS) {
      const group = INVALID_CASES[name]

      test(`rejects ${name}`, () => {
        for (const value of group.cases) {
          zenumsExpect.mustThrow(() => validateEnum([value]), group.code, {
            index: 0,
            value,
          })
        }
      })
    }

    test('capsOnly forbids ALL_CAPS without digits but allows CAPS+digits', () => {
      zenumsExpect.mustThrow(() => validateEnum(['HTTP']), 'capsOnly', {
        index: 0,
        value: 'HTTP',
      })

      zenumsExpect.noThrow(() => validateEnum(['HTTP2']))
    })
  })

  describe('invariants', () => {
    test('rejects exact duplicate values', () => {
      for (const [a, b] of DUPLICATE_CASES) {
        zenumsExpect.mustThrow(() => validateEnum([a, b]), 'duplicate', {
          index: 1,
          value: b,
        })
      }
    })
  })

  describe('success cases', () => {
    test('accepts min-length value', () => {
      for (const value of SINGLE_VALUES.MIN_OK) {
        zenumsExpect.noThrow(() => validateEnum([value]))
      }
    })

    test('accepts CAPS+digits tokens', () => {
      zenumsExpect.noThrow(() => validateEnum(CAPS_DIGITS_OK))
    })

    test('accepts valid values', () => {
      for (const values of VALID_CASES) {
        zenumsExpect.noThrow(() => validateEnum(values))
      }
    })
  })
})
