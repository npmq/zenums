import { describe, expect, test } from 'bun:test'
import * as z from 'zod'

import { createEnum } from '../../dist/index'
import { toZodEnum } from '../../dist/zod'

describe('integration: zenums/zod', () => {
  test('toZodEnum builds a schema that accepts only provided values (tuple order preserved)', () => {
    const E = createEnum(['stdout', 'stderr', 'API2'] as const)
    const Schema = toZodEnum(z, E.values)

    // accepts all enum values
    for (const v of E.values) {
      expect(Schema.parse(v)).toBe(v)
      expect(Schema.safeParse(v).success).toBe(true)
    }

    // rejects unknown
    const bad = Schema.safeParse('nope')
    expect(bad.success).toBe(false)

    // order preserved (important deterministic contract)
    expect(Schema.options).toEqual([...E.values])
  })

  test('schema infers correct literal union type', () => {
    const E = createEnum(['aa', 'bb'] as const)
    const Schema = toZodEnum(z, E.values)

    type T = z.infer<typeof Schema>

    // compile-time only assertion
    const value: T = 'bb'
    expect(value).toBe('bb')
  })
})
