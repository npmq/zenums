import type * as Z from 'zod'

type NonEmptyStringTuple = readonly [string, ...string[]]

/**
 * Thin wrapper over z.enum() preserving tuple literal types.
 *
 * Return type is inferred to stay compatible with supported Zod versions.
 */
export const toZodEnum = <T extends NonEmptyStringTuple>(
  z: typeof Z,
  values: T,
) => {
  return z.enum(values)
}
