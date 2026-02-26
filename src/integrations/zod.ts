import type * as Z from 'zod'

/**
 * Thin wrapper over z.enum() preserving tuple literal types
 * Return type is inferred for Zod v3/v4 compatibility
 */
export const toZodEnum = <T extends readonly [string, ...string[]]>(
  z: typeof Z,
  values: T,
) => {
  return z.enum(values)
}
