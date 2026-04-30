import { expect } from 'bun:test'
import { ZenumsError } from '../../src'
import type { EnumErrorCode, EnumErrorContext } from '../../src/types'

/** A single test case: a non-empty list of enum values */
export type ValuesCase = readonly [string, ...string[]]

/** Context type narrowed to a specific error code */
type ContextFor<K extends EnumErrorCode> = Extract<
  EnumErrorContext,
  { code: K }
>

/** Partial context assertion shape without the discriminant code */
type ContextSubset<K extends EnumErrorCode> = Partial<
  Omit<ContextFor<K>, 'code'>
>

/** ZenumsError narrowed by its discriminated context code */
type ZenumsErrorFor<K extends EnumErrorCode> = ZenumsError & {
  context: ContextFor<K>
}

/** Captures either a successful return value or a thrown value */
type CaptureResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

// Formats thrown values for readable assertion failure messages
function formatThrown(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? `${err.name}: ${err.message}`
  }

  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err, null, 2)
    } catch {
      return String(err)
    }
  }

  return String(err)
}

// Narrows generic enum error context to the exact context for a specific code
function assertContextCode<K extends EnumErrorCode>(
  context: EnumErrorContext,
  code: K,
): asserts context is ContextFor<K> {
  expect(context.code).toBe(code)
}

/** Builds a non-empty ValuesCase from arguments */
export const caseOf = (first: string, ...rest: string[]): ValuesCase => {
  return [first, ...rest]
}

/** Builds a two-value ValuesCase */
export const pair = (a: string, b: string): ValuesCase => {
  return [a, b]
}

/** Asserts that a value is frozen */
export const assertFrozen = <T>(value: T): void => {
  expect(Object.isFrozen(value)).toBe(true)
}

/** Asserts that text contains every expected substring */
export const expectTextContainsAll = (
  text: string,
  needles: readonly string[],
): void => {
  for (const needle of needles) {
    expect(text).toContain(needle)
  }
}

/** Asserts that text contains none of the forbidden substrings */
export const expectTextNotContainsAny = (
  text: string,
  needles: readonly string[],
): void => {
  for (const needle of needles) {
    expect(text).not.toContain(needle)
  }
}

/** Joins report lines into a single text blob for stable substring assertions */
export const toText = (lines: readonly string[]): string => {
  return lines.join('\n')
}

/** Helpers for capturing thrown values without losing the original error */
export const capture = {
  /** Captures a return value or thrown value */
  run<T>(fn: () => T): CaptureResult<T> {
    try {
      return { ok: true, value: fn() }
    } catch (error: unknown) {
      return { ok: false, error }
    }
  },

  /** Captures the thrown value and fails if nothing was thrown */
  mustThrow(fn: () => unknown): unknown {
    const result = capture.run(fn)

    if (result.ok) {
      expect.unreachable('Expected function to throw, but nothing was thrown')
    }

    return result.error
  },

  /** Asserts that the function does not throw */
  noThrow(fn: () => unknown): void {
    const result = capture.run(fn)

    if (!result.ok) {
      expect.unreachable(
        `Expected function not to throw, but it threw:\n${formatThrown(result.error)}`,
      )
    }
  },
} as const

/** Helpers for asserting ZenumsError shape, code, and context details */
export const zenumsExpect = {
  /** Asserts ZenumsError shape and checks code + optional context subset */
  thrownError<K extends EnumErrorCode>(
    err: unknown,
    code: K,
    contextSubset?: ContextSubset<K>,
  ): ZenumsErrorFor<K> {
    expect(err).toBeInstanceOf(ZenumsError)

    const e = err as ZenumsError
    expect(e.code).toBe(code)

    assertContextCode(e.context, code)

    if (contextSubset) {
      expect(e.context).toMatchObject(contextSubset)
    }

    return e as ZenumsErrorFor<K>
  },

  /** Runs fn and asserts that it throws ZenumsError with the expected code/context */
  mustThrow<K extends EnumErrorCode>(
    fn: () => unknown,
    code: K,
    contextSubset?: ContextSubset<K>,
  ): ZenumsErrorFor<K> {
    const err = capture.mustThrow(fn)

    return zenumsExpect.thrownError(err, code, contextSubset)
  },

  /** Runs fn and asserts that it does not throw */
  noThrow(fn: () => unknown): void {
    capture.noThrow(fn)
  },
} as const
