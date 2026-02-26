import { createEnum, toConstKey, toNameKey } from 'zenums'
import { toZodEnum } from 'zenums/zod'
import * as z from 'zod'

const VALUES = ['stdout', 'stderr', 'API2'] as const
const OK_VALUE = 'stdout' as const
const OK_ZOD_VALUE = 'stderr' as const
const BAD_VALUE = 'nope' as const

const E = createEnum(VALUES)

// --- public surface sanity (types)
void toConstKey(OK_VALUE)
void toNameKey(OK_VALUE)

// not exported: should be a type error
// @ts-expect-error - internal api must not be exported
E.toEnumKeys

// --- createEnum typing
type V = (typeof E.values)[number]
const ok: V = OK_VALUE
void ok

// @ts-expect-error - not in union
const bad: V = BAD_VALUE
void bad

// --- zod integration typing
const Schema = toZodEnum(z, E.values)
type T = z.infer<typeof Schema>

const ok2: T = OK_ZOD_VALUE
void ok2

// @ts-expect-error - not in union
const bad2: T = BAD_VALUE
void bad2

void Schema
