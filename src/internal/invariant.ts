import { throwEnumError } from '../errors'

/** Internal assertion helper for "should never happen" library invariants */
export function invariant(condition: unknown, text: string): asserts condition {
  if (condition) {
    return
  }

  throwEnumError({ code: 'internalInvariant', text })
}

/** Exhaustiveness helper for impossible branches (switch/default, unions) */
export function invariantNever(value: never, text: string): never {
  throwEnumError({
    code: 'internalInvariant',
    text: `${text} (received: ${String(value)})`,
  })
}
