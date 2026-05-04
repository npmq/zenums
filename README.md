# zenums [![CI](https://github.com/npmq/zenums/actions/workflows/ci.yml/badge.svg)](https://github.com/npmq/zenums/actions/workflows/ci.yml)

Type-safe enum creation for TypeScript and Zod — without duplicating enum values.

**zenums** turns one tuple of string literals into a small, frozen enum-like object with:

- preserved `values` as the single source of truth
- generated `constants` keys
- generated `names` keys
- runtime validation helpers
- type narrowing through `is()` and `parse()`
- lightweight type helpers such as `EnumValue`
- deterministic diagnostics for invalid definitions
- optional Zod integration through `zenums/zod`

```ts
import { createEnum } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

Transport.values
// readonly ['stdout', 'stderr', 'API2']

Transport.constants.STDOUT
// 'stdout'

Transport.names.Stdout
// 'stdout'

Transport.is('stdout')
// true

Transport.parse('stderr')
// 'stderr'
```

---

## Why zenums?

Use `zenums` when you want one tuple to be the single source of truth for:

- literal union types
- runtime enum-like access
- stable generated keys
- type-safe parsing
- Zod schemas without redefining values

Instead of maintaining duplicated values across TypeScript unions, runtime objects, and validation schemas, define the values once:

```ts
const VALUES = ['stdout', 'stderr', 'API2'] as const
```

Then reuse the same tuple everywhere.

---

## Install

```bash
npm i zenums
```

For beta versions:

```bash
npm i zenums@beta
```

Optional Zod integration requires `zod` in the consumer project:

```bash
npm i zod
```

---

## Quick start

```ts
import { createEnum, type EnumValue } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

type TransportValue = EnumValue<typeof Transport>
// 'stdout' | 'stderr' | 'API2'

Transport.values
// readonly ['stdout', 'stderr', 'API2']

Transport.constants.STDOUT
// 'stdout'

Transport.constants.STDERR
// 'stderr'

Transport.constants.API2
// 'API2'

Transport.names.Stdout
// 'stdout'

Transport.names.Stderr
// 'stderr'

Transport.names.API2
// 'API2'
```

---

## Type narrowing

`is(value)` works as a type guard.

```ts
import { createEnum } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

declare const input: string

if (Transport.is(input)) {
  input
  // ^? 'stdout' | 'stderr' | 'API2'
}
```

`parse(value)` returns the narrowed value or throws `ZenumsError`.

```ts
import { createEnum } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

const value = Transport.parse('stdout')
//    ^? 'stdout' | 'stderr' | 'API2'

Transport.parse('nope')
// throws ZenumsError with code: 'invalidValue'
```

This is useful at runtime boundaries:

```ts
import { createEnum } from 'zenums'

const Channel = createEnum(['email', 'sms', 'push'] as const)

function handleChannel(input: unknown) {
  const channel = Channel.parse(input)

  // channel is now narrowed to:
  // 'email' | 'sms' | 'push'

  return channel
}
```

---

## What createEnum returns

```ts
const E = createEnum(['foo-bar', 'stdout', 'API2'] as const)
```

`E` contains:

```ts
E.values
// original tuple, preserved as authored

E.constants
// prototype-less frozen record with CONSTANT_CASE keys

E.names
// prototype-less frozen record with PascalCase keys

E.is(value)
// type guard

E.parse(value)
// parser that returns the narrowed value or throws ZenumsError

E.withValues(fn)
// passes the original values tuple to fn without copying
```

The returned object and its public blocks are frozen.

---

## Type helpers

### EnumValue

`EnumValue` extracts the literal union from either a `createEnum()` result or from a raw `values` tuple.

```ts
import { createEnum, type EnumValue } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

type TransportValue = EnumValue<typeof Transport>
// 'stdout' | 'stderr' | 'API2'
```

You can also pass the tuple directly:

```ts
type TransportValueFromTuple = EnumValue<typeof Transport.values>
// 'stdout' | 'stderr' | 'API2'
```

This keeps contract code compact when many enum definitions are used:

```ts
import { createEnum, type EnumValue } from 'zenums'

export const inputChannelContract = createEnum([
  'args',
  'process',
  'object',
] as const)

export type InputChannel = EnumValue<typeof inputChannelContract>
// 'args' | 'process' | 'object'
```

When you need a single literal type from the generated object, use `constants`. Constants are strongly typed by their generated keys and preserve the exact literal value:

```ts
export const INPUT_CHANNELS = inputChannelContract.constants

export type DefaultInputChannel = typeof INPUT_CHANNELS.ARGS
// 'args'
```

`names` are useful for PascalCase runtime access, but they are not the recommended source for single-value type extraction right now. Prefer `EnumValue` for unions and `constants` for narrowed single-value types.

---

## Type inference

Use `EnumValue` when you need the full literal union:

```ts
import { createEnum, type EnumValue } from 'zenums'

const InputChannel = createEnum(['args', 'process', 'object'] as const)

type InputChannelValue = EnumValue<typeof InputChannel>
// 'args' | 'process' | 'object'
```

The direct tuple style is still supported:

```ts
type InputChannelValue = EnumValue<typeof InputChannel.values>
// 'args' | 'process' | 'object'
```

Use `constants` when you need a specific narrowed literal type:

```ts
const INPUT_CHANNELS = InputChannel.constants

type DefaultInputChannel = typeof INPUT_CHANNELS.ARGS
// 'args'
```

This is useful when a config contract needs a default value type that must stay connected to the enum source of truth:

```ts
import { createEnum, type EnumValue } from 'zenums'

export const inputChannelContract = createEnum(['args', 'process', 'object'] as const)

export const INPUT_CHANNELS = inputChannelContract.constants

export type InputChannel = EnumValue<typeof inputChannelContract>
export type DefaultInputChannel = typeof INPUT_CHANNELS.ARGS
```

`names` are intended for ergonomic runtime access. For single-value type extraction, prefer `constants`, because constants provide the most predictable narrowed literal typing across TypeScript versions.

---

## Key generation

`zenums` derives two stable key spaces from your string values:

- `constants`: `SCREAMING_SNAKE_CASE`
- `names`: `PascalCase`

```ts
import { createEnum } from 'zenums'

const Example = createEnum(['foo-bar', 'stdout', 'API2'] as const)

Example.values
// readonly ['foo-bar', 'stdout', 'API2']

Example.constants.FOO_BAR
// 'foo-bar'

Example.constants.STDOUT
// 'stdout'

Example.constants.API2
// 'API2'

Example.names.FooBar
// 'foo-bar'

Example.names.Stdout
// 'stdout'

Example.names.API2
// 'API2'
```

Separators are normalized:

```ts
import { createEnum } from 'zenums'

const Example = createEnum(['foo-bar', 'user_id'] as const)

Example.constants.FOO_BAR
// 'foo-bar'

Example.constants.USER_ID
// 'user_id'

Example.names.FooBar
// 'foo-bar'

Example.names.UserId
// 'user_id'
```

CamelCase and PascalCase are split into readable keys:

```ts
import { createEnum } from 'zenums'

const Example = createEnum(['fooBar', 'HttpRequest', 'XMLHttpRequest'] as const)

Example.constants.FOO_BAR
// 'fooBar'

Example.constants.HTTP_REQUEST
// 'HttpRequest'

Example.constants.XML_HTTP_REQUEST
// 'XMLHttpRequest'

Example.names.FooBar
// 'fooBar'

Example.names.HttpRequest
// 'HttpRequest'

Example.names.XmlHttpRequest
// 'XMLHttpRequest'
```

CAPS+digits tokens are preserved:

```ts
import { createEnum } from 'zenums'

const Example = createEnum(['API2', 'R2D2', 'HTTP2'] as const)

Example.constants.API2
// 'API2'

Example.names.API2
// 'API2'

Example.constants.R2D2
// 'R2D2'

Example.names.R2D2
// 'R2D2'
```

If you need to inspect generated keys directly:

```ts
import { toConstKey, toNameKey } from 'zenums'

toConstKey('foo-bar')
// 'FOO_BAR'

toNameKey('foo-bar')
// 'FooBar'
```

---

## Collision safety

Different values can normalize to the same generated key.

```ts
import { createEnum } from 'zenums'

createEnum(['foo-bar', 'foo_bar'] as const)
// throws ZenumsError with code: 'definitionRejected'
```

Both values would generate:

```ts
constants.FOO_BAR
names.FooBar
```

So `zenums` rejects the definition instead of silently overwriting data.

This is intentional. A valid enum definition must produce stable, unique keys.

---

## Input rules

`createEnum()` validates values before generating keys.

Rules are designed to keep generated keys deterministic, readable, and collision-safe.

Summary:

- input must be a non-empty array
- each item must be a string
- each value must be at least 2 characters
- allowed characters: `A–Z`, `a–z`, `0–9`, `-`, `_`
- use either `-` or `_`, not both in the same value
- no leading or trailing separators
- no repeated separators like `--` or `__`
- values must not start with a digit
- values must not be numeric-only, including separated numeric values like `1-2`
- values must contain at least one letter
- `ALL_CAPS` without digits is rejected
- `API2`, `R2D2`, `HTTP2` are allowed
- exact duplicate strings are rejected before key collision checks

Valid examples:

```ts
createEnum(['foo-bar', 'utf-8'] as const)
createEnum(['foo_bar', 'user1'] as const)
createEnum(['fooBar', 'one2Point'] as const)
createEnum(['FooBar', 'HttpRequest'] as const)
createEnum(['API2', 'R2D2', 'HTTP2'] as const)
```

Invalid examples:

```ts
createEnum([])
// emptyArray

createEnum(['a'] as const)
// tooShort

createEnum(['foo@bar'] as const)
// invalidChars

createEnum(['foo-_bar'] as const)
// mixedSeparatorStyles

createEnum(['-foo'] as const)
// badSeparatorPlacement

createEnum(['123'] as const)
// numericOnly

createEnum(['1foo'] as const)
// startsWithDigit

createEnum(['foo_Bar'] as const)
// separatedMustBeLowercase

createEnum(['HTTP'] as const)
// capsOnly

createEnum(['foo', 'foo'] as const)
// duplicate
```

---

## Zod integration

Zod support is optional.

If you use Zod, import the adapter from `zenums/zod`:

```ts
import * as z from 'zod'
import { createEnum } from 'zenums'
import { toZodEnum } from 'zenums/zod'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

const TransportSchema = toZodEnum(z, Transport.values)

TransportSchema.parse('stdout')
// 'stdout'

TransportSchema.safeParse('nope').success
// false
```

The adapter is a thin wrapper over `z.enum()` and preserves tuple literal types.

The return type is inferred to stay compatible with supported Zod versions.

You can also use Zod directly:

```ts
import * as z from 'zod'
import { createEnum } from 'zenums'

const VALUES = ['stdout', 'stderr', 'API2'] as const

const Transport = createEnum(VALUES)
const TransportSchema = z.enum(Transport.values)
```

For most cases, `z.enum(Transport.values)` is the most predictable option because it uses the original tuple values exactly as authored.

---

## Source of truth workflow

Recommended pattern:

```ts
import * as z from 'zod'
import { createEnum, type EnumValue } from 'zenums'

const TRANSPORT_VALUES = ['stdout', 'stderr', 'API2'] as const

export const Transport = createEnum(TRANSPORT_VALUES)

export type TransportValue = EnumValue<typeof Transport>

export const TransportSchema = z.enum(Transport.values)
```

Now the same tuple powers:

```ts
TransportValue
// TypeScript union

Transport.constants
// ergonomic runtime constants

Transport.names
// PascalCase runtime names

Transport.is(value)
// type guard

Transport.parse(value)
// runtime parser

TransportSchema
// Zod schema
```

No duplicated enum values.

---

## Aggregated reports

When multiple issues exist, `createEnum()` throws a `ZenumsError` with code `definitionRejected`.

The error includes a deterministic report designed for logs, tests, and debugging.

```ts
import { createEnum } from 'zenums'

createEnum(['foo', 'foo', 'foo-bar', 'foo_bar', 'a'] as const)
```

Example formatted output:

```text
ZenumsError: Enum definition rejected.

== Summary ==
received     5
valid        2
invalid      1
duplicates   1
collisions   2 (constants: 1, names: 1)

== Issues ==
[invalid]
-> [4] "a"
   code: tooShort
   message: minimum length is 2

[duplicates]
-> [0, 1] "foo"
   message: duplicate value

[collisions.constants]
-> "FOO_BAR"
   sources:
      - "foo-bar"
      - "foo_bar"

[collisions.names]
-> "FooBar"
   sources:
      - "foo-bar"
      - "foo_bar"
```

---

## Error handling

```ts
import { createEnum, ZenumsError } from 'zenums'

const Transport = createEnum(['stdout', 'stderr'] as const)

try {
  Transport.parse('nope')
} catch (error) {
  if (error instanceof ZenumsError) {
    error.code
    // 'invalidValue'

    error.context
    // typed error context
  }
}
```

Possible error codes include validation errors, collision errors, invalid runtime values, and internal invariant errors.

---

## Runtime support

`zenums` works in:

- Node.js `>=20`
- Bun
- modern ESM/CJS-compatible tooling

The package is published as plain JavaScript with both ESM and CJS builds.

Bun is used for development and tests, but Bun is not required at runtime.

---

## Public API

Main entry:

```ts
import {
  createEnum,
  toConstKey,
  toNameKey,
  ZenumsError,
  type EnumValue,
} from 'zenums'
```

Zod subpath:

```ts
import { toZodEnum } from 'zenums/zod'
```

---

## License

MIT
