import { describe, expect, test } from 'bun:test'
import { toConstKey, toNameKey } from '../../src'
import { invariantNever } from '../../src/internal/invariant'
import { checkCollisions } from '../../src/internal/validators'
import type { EnumKeyKind } from '../../src/types'
import {
  capture,
  caseOf,
  pair,
  type ValuesCase,
  zenumsExpect,
} from '../helpers/test-helpers'

// Contract fixtures: stable inputs/outputs for collision detection
// Purpose: keep tests intention-revealing and resistant to refactors

// Key kinds used by collision checks (single source of truth)
const KINDS = ['constants', 'names'] as const satisfies EnumKeyKind[]

// Resolves the key generator for a given kind
function getKeyFor(kind: EnumKeyKind): (value: string) => string {
  switch (kind) {
    case 'names':
      return toNameKey

    case 'constants':
      return toConstKey

    default:
      return invariantNever(kind, 'Unexpected EnumKeyKind')
  }
}

// Iterates kinds with stable literal typing (avoids repetition in tests)
function forEachKind(fn: (kind: EnumKeyKind) => void): void {
  for (const kind of KINDS) {
    fn(kind)
  }
}

// Adds a value source to key -> sources map (for collision reporting)
function addSource(
  map: Map<string, string[]>,
  key: string,
  source: string,
): void {
  const list = map.get(key)

  if (!list) {
    map.set(key, [source])

    return
  }

  list.push(source)
}

// Builds key -> sources map the same way createEnum does before checkCollisions
function buildKeyMap(
  kind: EnumKeyKind,
  values: ValuesCase,
): ReadonlyMap<string, readonly string[]> {
  const getKey = getKeyFor(kind)
  const map = new Map<string, string[]>()

  for (const value of values) {
    addSource(map, getKey(value), value)
  }

  return map
}

// Finds any collided key (first hit) from the same map we pass into checkCollisions
// Returns null if there are no collisions (used only inside mustThrow assertions)
function firstCollidedKey(
  keyMap: ReadonlyMap<string, readonly string[]>,
): string | null {
  for (const [key, sources] of keyMap) {
    if (sources.length > 1) {
      return key
    }
  }

  return null
}

// Assertions: keep tests scenario-style and validate error details
const collision = {
  mustThrow: (kind: EnumKeyKind, values: ValuesCase): void => {
    const keyMap = buildKeyMap(kind, values)

    const err = capture.mustThrow(() => checkCollisions(kind, keyMap))
    const e = zenumsExpect.thrownError(err, 'collision', { kind })

    const detailsText = e.context.details.join('\n')
    expect(detailsText.length).toBeGreaterThan(0)

    const collidedKey = firstCollidedKey(keyMap)
    expect(collidedKey).not.toBeNull()
    expect(detailsText).toContain(`Key '${collidedKey}'`)

    // All original values should be present in the error details
    for (const value of values) {
      expect(detailsText).toContain(value)
    }
  },

  noThrow: (kind: EnumKeyKind, values: ValuesCase): void => {
    const keyMap = buildKeyMap(kind, values)
    capture.noThrow(() => checkCollisions(kind, keyMap))
  },
} as const

// Diagnostic values to cover tricky casing/camel/separator combinations
const DIAGNOSTIC_VALUES = [
  'foo',
  'Foo',
  'fOo',
  'foO',
  'foOo',
  'FooOo',
  'Bar',
  'baR',
  'bar',
  'foobar',
  'foo-bar',
  'foo_bar',
  'fooBar',
  'FooBar',
  'HTTPRequest',
  'API2',
  'R2D2',
] as const

// Curated suites: readable “must throw / must pass” scenarios per key kind
const CASES = {
  SHOULD_THROW: {
    names: [
      pair('foo', 'Foo'),
      pair('foo-bar', 'foo_bar'),
      pair('foo-bar', 'fooBar'),
      pair('foo_bar', 'fooBar'),
      pair('fooBar', 'FooBar'),
      caseOf('foo-bar', 'foo_bar', 'fooBar'),
      caseOf('foo-bar', 'foo_bar', 'fooBar', 'FooBar'),
    ],
    constants: [
      pair('foo', 'Foo'),
      pair('foo-bar', 'foo_bar'),
      pair('foo-bar', 'fooBar'),
      pair('foo_bar', 'fooBar'),
      pair('fooBar', 'FooBar'),
      caseOf('foo-bar', 'foo_bar', 'fooBar'),
    ],
  },
  SHOULD_PASS: [
    caseOf('foo', 'bar', 'bazQux', 'API2'),
    caseOf('foo-bar', 'bar_baz', 'quxQuux', 'R2D2'),
    caseOf('foobar', 'fooBar', 'API2', 'R2D2'),
  ],
} as const satisfies Readonly<{
  SHOULD_THROW: Record<EnumKeyKind, readonly ValuesCase[]>
  SHOULD_PASS: readonly ValuesCase[]
}>

// Multi-collision scenario used to validate reporting can include multiple keys
const MULTI_COLLISION_CONSTANTS = caseOf(
  'foo',
  'Foo',
  'foo-bar',
  'foo_bar',
  'fooBar',
)

describe('checkCollisions', () => {
  describe('curated suites', () => {
    forEachKind(kind => {
      test(`throws for curated collision cases (${kind})`, () => {
        for (const values of CASES.SHOULD_THROW[kind]) {
          collision.mustThrow(kind, values)
        }
      })
    })

    test('passes for curated non-collision cases (both kinds)', () => {
      for (const values of CASES.SHOULD_PASS) {
        forEachKind(kind => {
          collision.noThrow(kind, values)
        })
      }
    })
  })

  // Pairwise diagnostic: must throw iff two inputs normalize to the same key
  describe('diagnostic matrix', () => {
    forEachKind(kind => {
      test(`diagnostic matrix: throws iff two values produce same key (${kind})`, () => {
        const getKey = getKeyFor(kind)

        for (const [i, a] of DIAGNOSTIC_VALUES.entries()) {
          for (const b of DIAGNOSTIC_VALUES.slice(i + 1)) {
            const values = pair(a, b)
            const sameKey = getKey(a) === getKey(b)

            if (sameKey) {
              collision.mustThrow(kind, values)

              continue
            }

            collision.noThrow(kind, values)
          }
        }
      })
    })
  })

  // Reporting: ensure error details contain multiple collided keys when present
  describe('reporting', () => {
    test('reports multiple collisions (constants)', () => {
      const kind: EnumKeyKind = 'constants'
      const keyMap = buildKeyMap(kind, MULTI_COLLISION_CONSTANTS)

      const err = capture.mustThrow(() => checkCollisions(kind, keyMap))
      const e = zenumsExpect.thrownError(err, 'collision', { kind })

      const text = e.context.details.join('\n')
      expect(text).toContain("Key 'FOO'")
      expect(text).toContain("Key 'FOO_BAR'")
    })
  })
})
