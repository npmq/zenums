type EmptyString = ''
type ConstSeparator = '-' | '_'
type ConstNormalizedSeparator = '_'

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

type If<Condition extends boolean, Then, Else> = Condition extends true
  ? Then
  : Else

type Or<A extends boolean, B extends boolean> = A extends true ? true : B

type IsOneOf<Value extends string, Set extends string> = Value extends Set
  ? true
  : false

type IsCaseAlpha<
  C extends string,
  SameCase extends string,
  OppositeCase extends string,
> = C extends SameCase
  ? If<C extends OppositeCase ? true : false, false, true>
  : false

type IsLowerAlpha<C extends string> = IsCaseAlpha<C, Lowercase<C>, Uppercase<C>>
type IsUpperAlpha<C extends string> = IsCaseAlpha<C, Uppercase<C>, Lowercase<C>>

type IsEmpty<S extends string> = IsOneOf<S, EmptyString>
type IsConstSeparator<C extends string> = IsOneOf<C, ConstSeparator>
type IsDigit<C extends string> = IsOneOf<C, Digit>

type IsCapsDigitsTokenChar<C extends string> = Or<IsUpperAlpha<C>, IsDigit<C>>

type IsCapsDigitsToken<
  S extends string,
  HasDigit extends boolean = false,
> = S extends `${infer Current}${infer Rest}`
  ? If<
      IsCapsDigitsTokenChar<Current>,
      IsCapsDigitsToken<Rest, Or<HasDigit, IsDigit<Current>>>,
      false
    >
  : HasDigit

type IsConstBoundaryAfterLower<Prev extends string> = IsLowerAlpha<Prev>
type IsConstBoundaryAfterDigit<Prev extends string> = IsDigit<Prev>

type IsConstAcronymBoundary<Prev extends string, Next extends string> = If<
  IsUpperAlpha<Prev>,
  IsLowerAlpha<Next>,
  false
>

type IsConstBoundaryAllowed<Prev extends string, Current extends string> = If<
  IsEmpty<Prev>,
  false,
  If<IsConstSeparator<Current>, false, IsUpperAlpha<Current>>
>

type HasConstBoundaryReason<Prev extends string, Next extends string> = Or<
  IsConstBoundaryAfterLower<Prev>,
  Or<IsConstBoundaryAfterDigit<Prev>, IsConstAcronymBoundary<Prev, Next>>
>

type ShouldInsertConstBoundary<
  Prev extends string,
  Current extends string,
  Next extends string,
> = If<
  IsConstBoundaryAllowed<Prev, Current>,
  HasConstBoundaryReason<Prev, Next>,
  false
>

type NormalizeConstSeparator<Char extends string> = Char extends ConstSeparator
  ? ConstNormalizedSeparator
  : Char

type NextChar<S extends string> = S extends `${infer Next}${string}`
  ? Next
  : EmptyString

type ConstBoundary<
  Prev extends string,
  Current extends string,
  Next extends string,
> = If<
  ShouldInsertConstBoundary<Prev, Current, Next>,
  ConstNormalizedSeparator,
  EmptyString
>

type AppendConstChar<Char extends string> = Uppercase<
  NormalizeConstSeparator<Char>
>

type AppendConstSegment<
  Prev extends string,
  Current extends string,
  Rest extends string,
> = `${ConstBoundary<Prev, Current, NextChar<Rest>>}${AppendConstChar<Current>}`

type BuildConstKey<
  Source extends string,
  Prev extends string = EmptyString,
  Result extends string = EmptyString,
> = Source extends `${infer Current}${infer Rest}`
  ? BuildConstKey<
      Rest,
      NormalizeConstSeparator<Current>,
      `${Result}${AppendConstSegment<Prev, Current, Rest>}`
    >
  : Result

/** Generated CONSTANTS key for a single enum value */
export type EnumConstKey<S extends string> = If<
  IsCapsDigitsToken<S>,
  S,
  BuildConstKey<S>
>
