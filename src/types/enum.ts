import type { EnumConstKey } from './constant-key'

/** Tuple of enum values used as a single source of truth */
export type EnumValues = readonly [string, ...string[]]

/** Union of allowed values extracted from EnumValues tuple */
export type EnumValue<T extends EnumValues> = T[number]

/** Record mapping generated CONSTANTS keys to exact enum values */
export type EnumConstants<T extends EnumValues> = Readonly<{
  [Value in EnumValue<T> as EnumConstKey<Value>]: Value
}>

/** Record mapping generated runtime keys to enum values */
export type EnumRecord<T extends EnumValues> = Readonly<
  Record<string, EnumValue<T>>
>

/** Key generation targets used for collision reporting */
export type EnumKeyKind = 'constants' | 'names'

/** Public enum object produced by createEnum */
export type EnumObject<T extends EnumValues> = Readonly<{
  values: T
  constants: EnumConstants<T>
  names: EnumRecord<T>

  is: (value: unknown) => value is EnumValue<T>
  parse: (value: unknown) => EnumValue<T>

  withValues: <R>(fn: (values: T) => R) => R
}>
