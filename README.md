# zenums

Type-safe enum creation for TypeScript and Zod — stop duplicating your enums.

**zenums** turns a tuple of string literals into a small, frozen enum-like object:

- `values` — the original tuple (single source of truth)
- `constants` — CONSTANT_CASE keys
- `names` — PascalCase keys
- `is(value)` — type guard
- `parse(value)` — runtime parser (throws `ZenumsError`)
- `withValues(fn)` — runs `fn(values)` without copying

It also supports **optional** Zod integration via a small subpath export.

---

## Install

```bash
npm i zenums
# optional peer (only if you want the zod helper)
npm i zod
```

---

## Quick start

```ts
import { createEnum } from 'zenums'

const Transport = createEnum(['stdout', 'stderr', 'API2'] as const)

// tuple values (single source of truth)
Transport.valuess
// => ['stdout', 'stderr', 'API2']

// constants + names
Transport.constants.STDOUT // 'stdout'
Transport.names.Stdout     // 'stdout'

// type guard
if (Transport.is('stdout')) {
  // 'stdout' is narrowed to the literal union
}

// parser (throws ZenumsError, code: 'invalidValue')
Transport.parse('nope')
```

---

## Key generation

`zenums` derives two stable key spaces from your **string values**:

- `constants`: `SCREAMING_SNAKE_CASE` keys for safe, ergonomic imports
- `names`: `PascalCase` keys for “nice” programmatic access

```ts
import { createEnum } from 'zenums'

const Transport = createEnum(['foo-bar', 'stdout', 'API2'] as const)

// values stay exactly as authored (order preserved)
Transport.values  // ['foo-bar', 'stdout', 'API2']

// constants: uppercase, separators normalized to underscore
Transport.constants.FOO_BAR  // 'foo-bar'
Transport.constants.STDOUT   // 'stdout'
Transport.constants.API2     // 'API2'

// names: PascalCase (separators are word breaks)
Transport.names.FooBar       // 'foo-bar'
Transport.names.Stdout       // 'stdout'
Transport.names.API2         // 'API2'
```

### Tricky examples and collisions

Some different inputs can generate the **same keys** after normalization:

```ts
const E = createEnum(['foo-bar', 'foo_bar'] as const)
// ❌ throws: collision (both produce FOO_BAR / FooBar)
```

Other “edge” but valid examples:

```ts
const E = createEnum(['r2d2', 'api2', 'my_value'] as const)

E.constants.R2D2    // 'r2d2'
E.names.R2d2        // 'r2d2'

E.constants.API2    // 'api2'
E.names.Api2        // 'api2'

E.constants.MY_VALUE // 'my_value'
E.names.MyValue      // 'my_value'
```

If you need the generated keys for debugging, you can call `toConstKey(value)` / `toNameKey(value)` directly.

### Input rules

`createEnum()` validates values before generating keys. Summary of the rules:

- **Array shape:** non-empty array
- **Type:** each item must be a string
- **Length:** at least 2 characters
- **Allowed chars:** `A–Z`, `a–z`, `0–9`, `-`, `_`
- **Separators:** either `-` *or* `_` (not both), no leading/trailing separators, no double separators (`--`, `__`)
- **Digits:** must not start with a digit, must not be numeric-only (even with separators like `1-2`)
- **Meaningful:** must contain at least one letter
- **CAPS tokens:** `ALL_CAPS` without digits is rejected, but `API2` / `R2D2` are allowed
- **Duplicates:** exact duplicate strings are rejected (no normalization)

When multiple issues exist, `createEnum()` throws a single **aggregated** error (`definitionRejected`) with a stable, deterministic report.

## Zod integration (optional)

If you use Zod, `zenums/zod` provides a thin wrapper over `z.enum()` that preserves tuple literal types.
Return type is inferred for **Zod v3 / v4** compatibility.

```ts
import * as z from 'zod'
import { createEnum } from 'zenums'
import { toZodEnum } from 'zenums/zod'

const E = createEnum(['stdout', 'stderr'] as const)
const Schema = toZodEnum(z, E.values)

Schema.parse('stdout') // ok
Schema.safeParse('nope').success // false
```

You can also skip the wrapper and use Zod directly:

```ts
const VALUES = ['active', 'pending'] as const
const E = createEnum(VALUES)

const SchemaA = z.enum(VALUES)    // uses tuple values (recommended)
const SchemaB = z.nativeEnum(E.constants) // uses generated constants keys (optional)
```

In general, **`z.enum(E.values)` is the most predictable** for string-literal unions and error messages.


---

## “Source of truth” workflow (no wrapper)

You can also keep your tuple as the single source of truth and reuse it for both `createEnum()` and `z.enum()`.

```ts
import * as z from 'zod'
import { createEnum } from 'zenums'

const VALUES = ['active', 'pending'] as const // 1) source of truth

const Status = createEnum(VALUES) // 2) runtime utilities
const StatusSchema = z.enum(VALUES) // 3) validation schema
```

---

## Aggregated report

When an enum definition has issues (invalid values, duplicates, collisions),
`createEnum()` throws a `ZenumsError` with a structured, deterministic report.

```ts
import { createEnum } from 'zenums'

createEnum(['foo', 'foo', 'foo-bar', 'foo_bar', 'a'] as const)
```

Example output:

```
ZenumsError: Enum definition rejected.

Stats:
  received: 5
  valid: 2
  invalid: 1
  duplicates: 1
  collisions: 2 (constants: 1, names: 1)

Details:
Invalid:
  • [4] tooShort

Duplicates:
  • 'foo' at indexes: 0, 1

Collisions (constants):
  Key 'FOO_BAR' is produced by:
    • 'foo-bar'
    • 'foo_bar'

Collisions (names):
  Key 'FooBar' is produced by:
    • 'foo-bar'
    • 'foo_bar'
```

---

## Value rules

zenums validates values **without normalizing your inputs** (author intent is preserved).

Rules (summary):

- values must be strings
- minimum length: **2**
- allowed chars: letters, digits, `-`, `_`
- separators (`-` / `_`) cannot be mixed
- no leading/trailing separator, no double separators
- numeric-only values are forbidden (even with separators, e.g. `1-2`)
- values must not start with a digit
- **if a value contains separators, it must be lowercase**
- ALL_CAPS values without digits are forbidden (but `API2` / `R2D2` are allowed)

---

## Exports

```ts
import { createEnum, toConstKey, toNameKey, ZenumsError } from 'zenums'
import { toZodEnum } from 'zenums/zod'
```

---

## License

MIT
