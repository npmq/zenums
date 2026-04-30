import { describe, expect, test } from 'bun:test'
import { invariant, invariantNever } from '../../src/internal/invariant'
import { zenumsExpect } from '../helpers/test-helpers'

const INTERNAL_INVARIANT_CODE = 'internalInvariant' as const

// Needle tokens for stable message assertions (single source of truth)
const TEXT = {
  NOPE: 'nope',
  BROKEN: 'broken',
  UNREACHABLE: 'unreachable',
  RECEIVED_X: 'received: x',
} as const

describe('invariant', () => {
  test('does nothing when condition is truthy', () => {
    expect(() => invariant(true, TEXT.NOPE)).not.toThrow()
    expect(() => invariant('truthy', TEXT.NOPE)).not.toThrow()
  })

  test('throws internalInvariant with provided text', () => {
    const e = zenumsExpect.mustThrow(
      () => invariant(false, TEXT.BROKEN),
      INTERNAL_INVARIANT_CODE,
      { text: TEXT.BROKEN },
    )

    expect(e.context.text).toBe(TEXT.BROKEN)
    expect(e.message).toContain(TEXT.BROKEN)
  })

  test('invariantNever throws internalInvariant and includes received value', () => {
    const e = zenumsExpect.mustThrow(
      () => invariantNever('x' as never, TEXT.UNREACHABLE),
      INTERNAL_INVARIANT_CODE,
    )

    expect(e.context.text).toContain(TEXT.UNREACHABLE)
    expect(e.context.text).toContain(TEXT.RECEIVED_X)
    expect(e.message).toContain(TEXT.UNREACHABLE)
    expect(e.message).toContain(TEXT.RECEIVED_X)
  })
})
