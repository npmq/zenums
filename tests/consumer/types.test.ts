import type { EnumConstKey, EnumValue } from 'zenums'
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

// --- exported type helpers

type StdoutConstKey = EnumConstKey<'stdout'>
type Api2ConstKey = EnumConstKey<'API2'>
type R2D2ConstKey = EnumConstKey<'R2D2'>
type HttpRequestConstKey = EnumConstKey<'HTTPRequest'>
type UserIdConstKey = EnumConstKey<'userID'>
type XmlHttpRequestConstKey = EnumConstKey<'XMLHttpRequest'>
type OAuth2TokenConstKey = EnumConstKey<'OAuth2Token'>
type Version2ApiConstKey = EnumConstKey<'version2API'>
type KebabCaseConstKey = EnumConstKey<'kebab-case'>
type SnakeCaseConstKey = EnumConstKey<'snake_case'>

const stdoutConstKey: StdoutConstKey = 'STDOUT'
const api2ConstKey: Api2ConstKey = 'API2'
const r2d2ConstKey: R2D2ConstKey = 'R2D2'
const httpRequestConstKey: HttpRequestConstKey = 'HTTP_REQUEST'
const userIdConstKey: UserIdConstKey = 'USER_ID'
const xmlHttpRequestConstKey: XmlHttpRequestConstKey = 'XML_HTTP_REQUEST'
const oauth2TokenConstKey: OAuth2TokenConstKey = 'O_AUTH2_TOKEN'
const version2ApiConstKey: Version2ApiConstKey = 'VERSION2_API'
const kebabCaseConstKey: KebabCaseConstKey = 'KEBAB_CASE'
const snakeCaseConstKey: SnakeCaseConstKey = 'SNAKE_CASE'

void stdoutConstKey
void api2ConstKey
void r2d2ConstKey
void httpRequestConstKey
void userIdConstKey
void xmlHttpRequestConstKey
void oauth2TokenConstKey
void version2ApiConstKey
void kebabCaseConstKey
void snakeCaseConstKey

// @ts-expect-error - stdout maps to STDOUT
const badStdoutConstKey: StdoutConstKey = 'stdout'

// @ts-expect-error - HTTPRequest maps to HTTP_REQUEST
const badHttpRequestConstKey: HttpRequestConstKey = 'HTTPREQUEST'

// @ts-expect-error - userID maps to USER_ID
const badUserIdConstKey: UserIdConstKey = 'USERID'

// @ts-expect-error - version2API maps to VERSION2_API
const badVersion2ApiConstKey: Version2ApiConstKey = 'VERSION2API'

void badStdoutConstKey
void badHttpRequestConstKey
void badUserIdConstKey
void badVersion2ApiConstKey

// not exported: should be a type error
// @ts-expect-error - internal api must not be exported
E.toEnumKeys

// --- createEnum value typing

type V = (typeof E.values)[number]

const ok: V = OK_VALUE
void ok

// @ts-expect-error - not in union
const bad: V = BAD_VALUE
void bad

// --- EnumValue helper typing

type VFromValues = EnumValue<typeof E.values>
type VFromEnum = EnumValue<typeof E>

const enumValueFromValues: VFromValues = OK_VALUE
const enumValueFromEnum: VFromEnum = OK_VALUE

void enumValueFromValues
void enumValueFromEnum

// @ts-expect-error - EnumValue from tuple should reject values outside the union
const badEnumValueFromValues: VFromValues = BAD_VALUE
void badEnumValueFromValues

// @ts-expect-error - EnumValue from enum object should reject values outside the union
const badEnumValueFromEnum: VFromEnum = BAD_VALUE
void badEnumValueFromEnum

const stdoutFromHelper: VFromEnum = E.constants.STDOUT
const stdoutConstantLiteral: 'stdout' = E.constants.STDOUT

void stdoutFromHelper
void stdoutConstantLiteral

// --- createEnum constants typing

type Constants = typeof E.constants

const constants: Constants = {
  STDOUT: 'stdout',
  STDERR: 'stderr',
  API2: 'API2',
}
void constants

const stdoutValue = E.constants.STDOUT
const stderrValue = E.constants.STDERR
const api2Value = E.constants.API2

const stdoutLiteral: 'stdout' = stdoutValue
const stderrLiteral: 'stderr' = stderrValue
const api2Literal: 'API2' = api2Value

void stdoutLiteral
void stderrLiteral
void api2Literal

// @ts-expect-error - generated CONSTANTS key must exist
E.constants.stdout

// @ts-expect-error - generated CONSTANTS key must exist
E.constants.NOPE

const mismatchedConstants: Constants = {
  // @ts-expect-error - value must match the generated key source
  STDOUT: 'stderr',

  // @ts-expect-error - value must match the generated key source
  STDERR: 'stdout',

  API2: 'API2',
}
void mismatchedConstants

// --- createEnum names typing

type Names = typeof E.names

const names: Names = {
  Stdout: 'stdout',
  Stderr: 'stderr',
  API2: 'API2',
}
void names

const nameValue = E.names.Stdout

const nameUnion: V = nameValue
void nameUnion

// names intentionally stay open by key: no complex type-level camelCase mirror
const unknownNameKeyValue = E.names.AnyGeneratedName
const unknownNameKeyUnion: V = unknownNameKeyValue

void unknownNameKeyUnion

const invalidNames: Names = {
  // @ts-expect-error - names values still must be valid enum values
  AnyNameKey: 'nope',
}
void invalidNames

// --- createEnum constants typing: complex generated keys

const COMPLEX_VALUES = [
  'kebab-case',
  'snake_case',
  'fooBar',
  'foo2Bar',
  'API2',
  'R2D2',
  'HTTPRequest',
  'userID',
  'XMLHttpRequest',
  'OAuth2Token',
  'version2API',
] as const

const Complex = createEnum(COMPLEX_VALUES)

type ComplexValue = (typeof Complex.values)[number]
type ComplexValueFromValues = EnumValue<typeof Complex.values>
type ComplexValueFromEnum = EnumValue<typeof Complex>

const complexValueFromValues: ComplexValueFromValues = 'OAuth2Token'
const complexValueFromEnum: ComplexValueFromEnum = 'version2API'

void complexValueFromValues
void complexValueFromEnum

// @ts-expect-error - EnumValue from complex enum should reject values outside the union
const badComplexValueFromEnum: ComplexValueFromEnum = BAD_VALUE
void badComplexValueFromEnum

const complexConstants: typeof Complex.constants = {
  KEBAB_CASE: 'kebab-case',
  SNAKE_CASE: 'snake_case',
  FOO_BAR: 'fooBar',
  FOO2_BAR: 'foo2Bar',
  API2: 'API2',
  R2D2: 'R2D2',
  HTTP_REQUEST: 'HTTPRequest',
  USER_ID: 'userID',
  XML_HTTP_REQUEST: 'XMLHttpRequest',
  O_AUTH2_TOKEN: 'OAuth2Token',
  VERSION2_API: 'version2API',
}
void complexConstants

const kebabValue = Complex.constants.KEBAB_CASE
const snakeValue = Complex.constants.SNAKE_CASE
const fooBarValue = Complex.constants.FOO_BAR
const foo2BarValue = Complex.constants.FOO2_BAR
const complexApi2Value = Complex.constants.API2
const r2d2Value = Complex.constants.R2D2
const httpRequestValue = Complex.constants.HTTP_REQUEST
const userIdValue = Complex.constants.USER_ID
const xmlHttpRequestValue = Complex.constants.XML_HTTP_REQUEST
const oauth2TokenValue = Complex.constants.O_AUTH2_TOKEN
const version2ApiValue = Complex.constants.VERSION2_API

const kebabLiteral: 'kebab-case' = kebabValue
const snakeLiteral: 'snake_case' = snakeValue
const fooBarLiteral: 'fooBar' = fooBarValue
const foo2BarLiteral: 'foo2Bar' = foo2BarValue
const complexApi2Literal: 'API2' = complexApi2Value
const r2d2Literal: 'R2D2' = r2d2Value
const httpRequestLiteral: 'HTTPRequest' = httpRequestValue
const userIdLiteral: 'userID' = userIdValue
const xmlHttpRequestLiteral: 'XMLHttpRequest' = xmlHttpRequestValue
const oauth2TokenLiteral: 'OAuth2Token' = oauth2TokenValue
const version2ApiLiteral: 'version2API' = version2ApiValue

void kebabLiteral
void snakeLiteral
void fooBarLiteral
void foo2BarLiteral
void complexApi2Literal
void r2d2Literal
void httpRequestLiteral
void userIdLiteral
void xmlHttpRequestLiteral
void oauth2TokenLiteral
void version2ApiLiteral

// @ts-expect-error - dash-separated value maps to underscore CONSTANTS key
Complex.constants.KEBAB

// @ts-expect-error - snake_case keeps underscore and uppercases letters
Complex.constants.SNAKECASE

// @ts-expect-error - camelCase gets a lowercase-to-uppercase boundary
Complex.constants.FOOBAR

// @ts-expect-error - digit-to-uppercase boundary is preserved
Complex.constants.FOO2BAR

// @ts-expect-error - acronym boundary is preserved for HTTPRequest
Complex.constants.HTTPREQUEST

// @ts-expect-error - userID keeps acronym-style boundary as USER_ID
Complex.constants.USERID

// @ts-expect-error - XMLHttpRequest splits acronym + words
Complex.constants.XMLHTTPREQUEST

// @ts-expect-error - OAuth2Token has the generated O_AUTH2_TOKEN key
Complex.constants.OAUTH2_TOKEN

// @ts-expect-error - version2API has digit-to-uppercase boundary before API
Complex.constants.VERSION2API

const complexNamesValue = Complex.names.AnyGeneratedName
const complexNamesUnion: ComplexValue = complexNamesValue

void complexNamesUnion

const invalidComplexNames: typeof Complex.names = {
  // @ts-expect-error - names values still must be valid enum values
  AnyNameKey: 'nope',
}
void invalidComplexNames

// --- zod integration typing

const Schema = toZodEnum(z, E.values)
type T = z.infer<typeof Schema>

const ok2: T = OK_ZOD_VALUE
void ok2

// @ts-expect-error - not in union
const bad2: T = BAD_VALUE
void bad2

void Schema
