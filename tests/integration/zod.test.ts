import { describe, expect, test } from 'bun:test'
import * as z from 'zod'

import { createEnum } from '../../dist/index'
import { toZodEnum } from '../../dist/zod'

// Contract fixtures: stable inputs/outputs for built package zod integration
// Purpose: verify dist exports behave like a real consumer would use them

const VALUES = ['stdout', 'stderr', 'API2'] as const
const CAPS_DIGITS_VALUES = ['API2', 'R2D2', 'HTTP2'] as const
const BAD_VALUE = 'nope' as const

describe('integration: zenums/zod', () => {
  test('toZodEnum builds a ZodEnum that accepts only provided values and preserves tuple order', () => {
    const E = createEnum(VALUES)
    const Schema = toZodEnum(z, E.values)

    expect(Schema).toBeInstanceOf(z.ZodEnum)

    // Accepts all enum values
    for (const value of E.values) {
      expect(Schema.parse(value)).toBe(value)
      expect(Schema.safeParse(value).success).toBe(true)
    }

    // Rejects unknown values
    const bad = Schema.safeParse(BAD_VALUE)
    expect(bad.success).toBe(false)

    // Order is part of the deterministic contract
    expect(Schema.options).toEqual([...E.values])
  })

  test('toZodEnum preserves CAPS+digits values without normalization', () => {
    const E = createEnum(CAPS_DIGITS_VALUES)
    const Schema = toZodEnum(z, E.values)

    expect(Schema.options).toEqual([...CAPS_DIGITS_VALUES])

    for (const value of CAPS_DIGITS_VALUES) {
      expect(Schema.parse(value)).toBe(value)
    }
  })

  test('schema infers the exact literal union type', () => {
    const E = createEnum(['aa', 'bb'] as const)
    const Schema = toZodEnum(z, E.values)

    type T = z.infer<typeof Schema>

    const ok: T = 'bb'
    expect(ok).toBe('bb')

    // @ts-expect-error - not part of the inferred literal union
    const bad: T = BAD_VALUE
    void bad
  })

  test('source-of-truth tuple can be reused for createEnum + z.enum without an adapter', () => {
    const E = createEnum(VALUES)
    const Schema = z.enum(VALUES)

    // zenums: values preserved exactly in author order
    expect(E.values).toEqual(VALUES)

    // zod: accepts only provided values
    for (const value of VALUES) {
      expect(Schema.parse(value)).toBe(value)
      expect(Schema.safeParse(value).success).toBe(true)
    }

    const bad = Schema.safeParse(BAD_VALUE)
    expect(bad.success).toBe(false)

    // zod: tuple order preserved as options
    expect(Schema.options).toEqual([...VALUES])
  })
})
