import { expect } from 'bun:test'
import { ZenumsError } from '../../src'
import type { EnumErrorCode, EnumErrorContext } from '../../src/types'

/** A single test case: a NON-empty list of enum values */
export type ValuesCase = readonly [string, ...string[]]

/** Context type for a specific error code */
type ContextFor<K extends EnumErrorCode> = Extract<
  EnumErrorContext,
  { code: K }
>

/** Subset of context fields for assertions (excluding the discriminant `code`) */
type ContextSubset<K extends EnumErrorCode> = Partial<
  Omit<ContextFor<K>, 'code'>
>

/** ZenumsError narrowed by code */
type ZenumsErrorFor<K extends EnumErrorCode> = ZenumsError & {
  context: ContextFor<K>
}

// Formats thrown values for readable failure messages
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

// Narrows context shape to the exact context for a given code
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

/** Builds a pair ValuesCase */
export const pair = (a: string, b: string): ValuesCase => {
  return [a, b]
}

/** Assertions: shared helpers to keep tests compact and intention-revealing */

export const assertFrozen = <T>(value: T): void => {
  expect(Object.isFrozen(value)).toBe(true)
}

export const expectTextContainsAll = (
  text: string,
  needles: readonly string[],
): void => {
  for (const s of needles) {
    expect(text).toContain(s)
  }
}

export const expectTextNotContainsAny = (
  text: string,
  needles: readonly string[],
): void => {
  for (const s of needles) {
    expect(text).not.toContain(s)
  }
}

/** Joins report lines into a single text blob for stable substring assertions */
export const toText = (lines: readonly string[]): string => {
  return lines.join('\n')
}

// Captures success value or thrown error from fn()
type CaptureResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

/** Helpers for capturing thrown values */
export const capture = {
  /** Captures result or thrown error */
  run<T>(fn: () => T): CaptureResult<T> {
    try {
      return { ok: true, value: fn() }
    } catch (error: unknown) {
      return { ok: false, error }
    }
  },

  /** Captures thrown value and fails if nothing was thrown */
  mustThrow(fn: () => unknown): unknown {
    const res = capture.run(fn)

    if (res.ok) {
      expect.unreachable('Expected function to throw, but nothing was thrown')
    }

    return res.error
  },

  /** Asserts that the function does NOT throw */
  noThrow(fn: () => unknown): void {
    const res = capture.run(fn)

    if (!res.ok) {
      expect.unreachable(
        `Expected function not to throw, but it threw:\n${formatThrown(res.error)}`,
      )
    }
  },
} as const

/** Helpers for asserting ZenumsError shape and details */
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

  /** Runs fn and asserts it throws ZenumsError with given code/context */
  mustThrow<K extends EnumErrorCode>(
    fn: () => unknown,
    code: K,
    contextSubset?: ContextSubset<K>,
  ): ZenumsErrorFor<K> {
    const err = capture.mustThrow(fn)
    return zenumsExpect.thrownError(err, code, contextSubset)
  },

  /** Runs fn and asserts it does NOT throw */
  noThrow(fn: () => unknown): void {
    capture.noThrow(fn)
  },
} as const
