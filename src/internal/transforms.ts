import { invariant } from './invariant'

/** Non-empty array helper type (used after runtime checks) */
type NonEmptyArray<T> = readonly [T, ...T[]]

/** Regexes used by the tokenizer (kept frozen for consistency) */
const RE = Object.freeze({
  // CAPS+digits token: R2D2, API2, AB12 (but NOT FOO)
  capsDigitsToken: /^(?=.*\d)[A-Z0-9]+$/,
  // Tokenize no-separator strings: HTTPRequest -> ["HTTP", "Request"], foo2Bar -> ["foo2", "Bar"]
  tokenize: /[A-Z0-9]+(?=[A-Z][a-z])|[A-Z]?[a-z0-9]+|[A-Z0-9]+/g,
})

/** Domain separators used by naming rules */
const SEPARATORS = {
  dash: '-',
  underscore: '_',
} as const

// Assertion helper removes the cast from toNonEmpty
function assertNonEmpty<T>(arr: T[], msg: string): asserts arr is [T, ...T[]] {
  invariant(arr.length > 0, msg)
}

// Now returns NonEmptyArray<T> without any cast
function toNonEmpty<T>(arr: T[], msg: string): NonEmptyArray<T> {
  assertNonEmpty(arr, msg)

  return arr
}

// Splits by separator if present, otherwise tokenizes Camel/Pascal/abbrev boundaries
function splitParts(value: string): NonEmptyArray<string> {
  if (value.includes(SEPARATORS.dash)) {
    return toNonEmpty(
      value.split(SEPARATORS.dash),
      `splitParts '${SEPARATORS.dash}': '${value}' produced empty parts`,
    )
  }

  if (value.includes(SEPARATORS.underscore)) {
    return toNonEmpty(
      value.split(SEPARATORS.underscore),
      `splitParts '${SEPARATORS.underscore}': '${value}' produced empty parts`,
    )
  }

  // Keep CAPS+digits as a single token: R2D2 -> ["R2D2"]
  if (RE.capsDigitsToken.test(value)) {
    return [value]
  }

  const match = value.match(RE.tokenize)
  if (!match) {
    return [value]
  }

  return toNonEmpty(
    match,
    `splitParts tokenize: '${value}' produced empty token list`,
  )
}

// Formats one name token to Airbnb-ish PascalCase (HTTP -> Http)
function formatNameToken(token: string): string {
  if (RE.capsDigitsToken.test(token)) {
    return token
  }

  const lower = token.toLowerCase()

  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Returns both constant and name keys for one enum value */
export const toEnumKeys = (
  value: string,
): { constantKey: string; nameKey: string } => {
  const parts = splitParts(value)

  // Fast-path: a single CAPS+digits token should remain unchanged
  if (parts.length === 1 && RE.capsDigitsToken.test(parts[0])) {
    return { constantKey: parts[0], nameKey: parts[0] }
  }

  const constantParts: string[] = []
  const nameParts: string[] = []

  for (const part of parts) {
    constantParts.push(part.toUpperCase())
    nameParts.push(formatNameToken(part))
  }

  return {
    constantKey: constantParts.join(SEPARATORS.underscore),
    nameKey: nameParts.join(''),
  }
}

/** Converts enum value to CONSTANTS_KEY form */
export const toConstKey = (value: string): string => {
  return toEnumKeys(value).constantKey
}

/** Converts enum value to NameKey (PascalCase) form */
export const toNameKey = (value: string): string => {
  return toEnumKeys(value).nameKey
}
