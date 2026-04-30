/** Collision tuple used by collectors and error payloads */
export type CollisionItem = Readonly<{
  key: string
  sources: readonly string[]
}>

/** Duplicate summary: one value, many indexes */
export type RejectedDuplicateItem = Readonly<{
  value: string
  indexes: readonly number[]
}>

/** Collision summary split by generated key kind */
export type RejectedCollisionByKind = Readonly<{
  constants: readonly CollisionItem[]
  names: readonly CollisionItem[]
}>

/** Machine-readable report for dev tools / CI / UI */
export type RejectedReport = Readonly<{
  invalid: readonly RejectedInvalidItem[]
  duplicates: readonly RejectedDuplicateItem[]
  collisions: RejectedCollisionByKind
}>

/** Small stats block for logs / metrics */
export type RejectedStats = Readonly<{
  received: number
  valid: number
  invalid: number
  duplicates: number
  collisions: Readonly<{
    total: number
    constants: number
    names: number
  }>
}>

/**
 * Value-level validation errors collected without stopping.
 *
 * Shape-level errors stay fail-fast and are not part of definition reports.
 */
export type RejectedInvalidItem = Readonly<
  | {
      code: 'notString'
      index: number
      receivedType: string
    }
  | {
      code: 'tooShort'
      index: number
      value: string
      minLength: number
    }
  | {
      code: 'invalidChars'
      index: number
      value: string
      invalidChar: string
      position?: number | undefined
    }
  | {
      code: 'mixedSeparatorStyles'
      index: number
      value: string
    }
  | {
      code: 'badSeparatorPlacement'
      index: number
      value: string
    }
  | {
      code: 'numericOnly'
      index: number
      value: string
    }
  | {
      code: 'startsWithDigit'
      index: number
      value: string
    }
  | {
      code: 'separatedMustBeLowercase'
      index: number
      value: string
    }
  | {
      code: 'notMeaningful'
      index: number
      value: string
    }
  | {
      code: 'capsOnly'
      index: number
      value: string
    }
>
