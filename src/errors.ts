import type { EnumErrorCode, EnumErrorContext } from './types'

// Extracts the exact context shape for a specific error code
type Ctx<K extends EnumErrorCode> = Extract<EnumErrorContext, { code: K }>

// Message builder signature bound to a specific error code/context pair
type MakeMessage<K extends EnumErrorCode> = (ctx: Ctx<K>) => string

// Single place to tune preview size for invalidValue messages
const MAX_EXPECTED_PREVIEW = 10

// Formatting helpers for multi-line console-friendly messages

const NL = '\n'

function joinLines(lines: readonly string[]): string {
  return lines.join(NL)
}

function hasLines(lines: readonly string[]): boolean {
  return lines.length > 0
}

function quote(s: string): string {
  return `'${s}'`
}

function formatStats(stats: Ctx<'definitionRejected'>['stats']): string {
  const totalCollisions = stats.collisions.total
  const collisionsPart =
    totalCollisions > 0
      ? `${totalCollisions} (constants: ${stats.collisions.constants}, names: ${stats.collisions.names})`
      : '0'

  return (
    `Stats:${NL}` +
    `  received: ${stats.received}${NL}` +
    `  valid: ${stats.valid}${NL}` +
    `  invalid: ${stats.invalid}${NL}` +
    `  duplicates: ${stats.duplicates}${NL}` +
    `  collisions: ${collisionsPart}`
  )
}

// Canonical error messages (implementation detail)
const MESSAGES = {
  internalInvariant: ctx => `Internal invariant violation: ${String(ctx.text)}`,

  notArray: ctx => `Expected an array, got ${ctx.receivedType}`,
  emptyArray: _ctx => 'Array cannot be empty',

  notString: ctx =>
    `Element at index ${ctx.index} is not a string: ${ctx.receivedType}`,

  tooShort: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' must be at least ${ctx.minLength} characters long.`,

  startsWithDigit: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' must not start with a digit.`,

  invalidChars: ctx => {
    const where =
      typeof ctx.position === 'number' ? ` at position ${ctx.position}` : ''

    return (
      `Value at index ${ctx.index} '${ctx.value}' contains invalid character ${quote(ctx.invalidChar)}${where}. ` +
      `Only allowed: letters, digits, '-', '_' .`
    )
  },

  invalidValue: ctx => {
    const shown = ctx.expected
      .slice(0, MAX_EXPECTED_PREVIEW)
      .map(v => `'${v}'`)
      .join(', ')
    const rest =
      ctx.expected.length > MAX_EXPECTED_PREVIEW
        ? `, … +${ctx.expected.length - MAX_EXPECTED_PREVIEW} more`
        : ''

    return (
      `Invalid enum value: '${String(ctx.value)}' (type: ${ctx.receivedType}). ` +
      `Expected one of: ${shown}${rest}`
    )
  },

  mixedSeparatorStyles: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' mixes '-' and '_' separators. Use only one.`,

  badSeparatorPlacement: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' has invalid separator placement. ` +
    `Must not start/end with separator and must not contain double separators.`,

  separatedMustBeLowercase: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' uses separators but contains uppercase letters. ` +
    `Use lowercase for kebab-case/snake_case.`,

  notMeaningful: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' must contain at least 1 letter.`,

  numericOnly: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' is numeric-only and not allowed.`,

  capsOnly: ctx =>
    `Value at index ${ctx.index} '${ctx.value}' is ALL_CAPS without digits and is not allowed.`,

  duplicate: ctx =>
    `Duplicate value found at index ${ctx.index}: '${ctx.value}'`,

  collision: ctx => {
    const body = joinLines(ctx.details)

    return body.length === 0
      ? `Key collision detected in ${ctx.kind}!`
      : `Key collision detected in ${ctx.kind}!${NL}${NL}${body}`
  },

  // Aggregated failure: invalid items / duplicates / collisions collected first, then rejected.
  // Variant D: details (human) + stats (quick dashboard numbers).
  definitionRejected: ctx => {
    const header = 'Enum definition rejected.'
    const statsBlock = formatStats(ctx.stats)

    // details are already "human-readable lines" prepared by validators/create step
    if (!hasLines(ctx.details)) {
      return `${header}${NL}${NL}${statsBlock}`
    }

    return (
      `${header}${NL}${NL}` +
      `${statsBlock}${NL}${NL}` +
      `Details:${NL}` +
      `${joinLines(ctx.details)}`
    )
  },
} satisfies { [K in EnumErrorCode]: MakeMessage<K> }

/** Library error with stable code and structured context */
export class ZenumsError extends Error {
  public readonly code: EnumErrorCode
  public readonly context: EnumErrorContext

  constructor(context: EnumErrorContext, message: string) {
    super(message)

    // Better stack traces in V8 environments (Node, Bun)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZenumsError)
    }

    this.name = 'ZenumsError'
    this.code = context.code
    this.context = context
  }
}

// One narrow cast in one place: restores K -> MakeMessage<K> relation
function getMessage<K extends EnumErrorCode>(code: K): MakeMessage<K> {
  return MESSAGES[code] as MakeMessage<K>
}

/** Typed error thrower (context-first) */
export function throwEnumError<K extends EnumErrorCode>(
  context: Ctx<K>,
): never {
  const makeMessage = getMessage(context.code)
  throw new ZenumsError(context, makeMessage(context))
}
