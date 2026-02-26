#!/usr/bin/env bash
set -euo pipefail

mkdir -p \
  src/internal \
  src/integrations \
  tests/unit \
  tests/integration

cat > src/index.ts <<'EOF'
export { createEnum } from './create';

export { EnumValidationError, throwEnumError } from './errors';

export type {
  CreateEnumOptions,
  EnumErrorCode,
  EnumErrorContext,
  EnumObject,
  EnumValue,
  EnumValues,
} from './types';
EOF

cat > src/types.ts <<'EOF'
export type EnumValues = readonly [string, ...string[]];

export type EnumValue<T extends EnumValues> = T[number];

export type EnumRecord<T extends EnumValues> = Readonly<Record<string, EnumValue<T>>>;

export type CreateEnumOptions = Readonly<{
  // TODO: configs/presets later
}>;

export type EnumErrorCode =
  | 'notArray'
  | 'emptyArray'
  | 'notString'
  | 'tooShort'
  | 'invalidChars'
  | 'mixedSeparatorStyles'
  | 'badSeparatorPlacement'
  | 'numericOnly'
  | 'startsWithDigit'
  | 'separatedMustBeLowercase'
  | 'notMeaningful'
  | 'capsOnly'
  | 'duplicate'
  | 'collision';

export type EnumErrorContext =
  | { code: 'notArray'; receivedType: string }
  | { code: 'emptyArray' }
  | { code: 'notString'; index: number; receivedType: string }
  | { code: 'tooShort'; index: number; value: string; minLength: number }
  | { code: 'invalidChars'; index: number; value: string; invalidChar: string; position: number }
  | { code: 'mixedSeparatorStyles'; index: number; value: string }
  | { code: 'badSeparatorPlacement'; index: number; value: string }
  | { code: 'numericOnly'; index: number; value: string }
  | { code: 'startsWithDigit'; index: number; value: string }
  | { code: 'separatedMustBeLowercase'; index: number; value: string }
  | { code: 'notMeaningful'; index: number; value: string }
  | { code: 'capsOnly'; index: number; value: string }
  | { code: 'duplicate'; index: number; value: string }
  | { code: 'collision'; kind: 'constants' | 'names'; details: string };

export type EnumObject<T extends EnumValues> = Readonly<{
  values: T;
  constants: EnumRecord<T>;
  names: EnumRecord<T>;

  is: (value: unknown) => value is EnumValue<T>;
  parse: (value: unknown) => EnumValue<T>;

  adapt: <R>(fn: (values: T) => R) => R;
}>;
EOF

cat > src/errors.ts <<'EOF'
import type { EnumErrorCode, EnumErrorContext } from './types';

export class EnumValidationError extends Error {
  public readonly code: EnumErrorCode;

  public readonly context: EnumErrorContext;

  public constructor(context: EnumErrorContext) {
    super(context.code);
    this.name = 'EnumValidationError';
    this.code = context.code;
    this.context = context;
  }
}

export const throwEnumError = (context: EnumErrorContext): never => {
  throw new EnumValidationError(context);
};
EOF

cat > src/create.ts <<'EOF'
import type { CreateEnumOptions, EnumObject, EnumValues } from './types';
import { buildKeyRecord, toConstKey, toNameKey } from './internal/transforms';
import { createGuards } from './internal/guards';
import { validateEnumValues } from './internal/validators';

export const createEnum = <T extends EnumValues>(
  values: T,
  _options: CreateEnumOptions = {},
): EnumObject<T> => {
  validateEnumValues(values);

  const constants = buildKeyRecord(values, toConstKey, { kind: 'constants' });
  const names = buildKeyRecord(values, toNameKey, { kind: 'names' });

  const { is, parse } = createGuards(values);

  const adapt: EnumObject<T>['adapt'] = (fn) => {
    return fn(values);
  };

  return Object.freeze({
    values,
    constants,
    names,
    is,
    parse,
    adapt,
  });
};
EOF

cat > src/internal/validators.ts <<'EOF'
import type { EnumValues } from '../types';
import { throwEnumError } from '../errors';

// пока минимальный валидатор: массив + строки + дубликаты
// (полные правила добавим после финализации конфигов)
export const validateEnumValues = <T extends EnumValues>(values: T): void => {
  if (!Array.isArray(values)) {
    throwEnumError({ code: 'notArray', receivedType: typeof values });
  }

  if (values.length === 0) {
    throwEnumError({ code: 'emptyArray' });
  }

  const seen = new Set<string>();

  values.forEach((v, index) => {
    if (typeof v !== 'string') {
      throwEnumError({ code: 'notString', index, receivedType: typeof v });
    }

    if (seen.has(v)) {
      throwEnumError({ code: 'duplicate', index, value: v });
    }

    seen.add(v);
  });
};
EOF

cat > src/internal/transforms.ts <<'EOF'
import { throwEnumError } from '../errors';

type KeyKind = 'constants' | 'names';

const hasSeparator = (value: string): boolean => {
  return value.includes('-') || value.includes('_');
};

const capitalizeFirst = (s: string): string => {
  if (s.length === 0) {
    return s;
  }

  return s[0].toUpperCase() + s.slice(1);
};

export const toNameKey = (value: string): string => {
  if (!hasSeparator(value)) {
    return capitalizeFirst(value);
  }

  const parts = value.split(/[-_]/g);

  return parts
    .filter((p) => p.length > 0)
    .map((p) => {
      return capitalizeFirst(p.toLowerCase());
    })
    .join('');
};

export const toConstKey = (value: string): string => {
  if (!hasSeparator(value)) {
    return value.toUpperCase();
  }

  return value.replace(/[-_]/g, '_').toUpperCase();
};

export const buildKeyRecord = <T extends readonly [string, ...string[]]>(
  values: T,
  keyFn: (value: string) => string,
  opts: Readonly<{ kind: KeyKind }>,
): Readonly<Record<string, T[number]>> => {
  const out: Record<string, T[number]> = Object.create(null);
  const collisions = new Map<string, string[]>();

  values.forEach((value) => {
    const key = keyFn(value);

    if (Object.prototype.hasOwnProperty.call(out, key)) {
      const list = collisions.get(key) ?? [out[key] as string];
      list.push(value);
      collisions.set(key, list);
      return;
    }

    out[key] = value;
  });

  if (collisions.size > 0) {
    const details = [...collisions.entries()]
      .map(([key, sources]) => {
        return `  • Key '${key}' from values: ${sources.map((v) => `'${v}'`).join(', ')}`;
      })
      .join('\n');

    throwEnumError({ code: 'collision', kind: opts.kind, details });
  }

  return Object.freeze(out);
};
EOF

cat > src/internal/guards.ts <<'EOF'
import type { EnumValues } from '../types';
import { throwEnumError } from '../errors';

export const createGuards = <T extends EnumValues>(values: T) => {
  const set = new Set<string>(values);

  const is = (value: unknown): value is T[number] => {
    if (typeof value !== 'string') {
      return false;
    }

    return set.has(value);
  };

  const parse = (value: unknown): T[number] => {
    if (typeof value !== 'string') {
      throwEnumError({ code: 'notString', index: -1, receivedType: typeof value });
    }

    if (!set.has(value)) {
      throwEnumError({
        code: 'invalidChars',
        index: -1,
        value,
        invalidChar: '?',
        position: -1,
      });
    }

    return value as T[number];
  };

  return { is, parse };
};
EOF

cat > src/integrations/zod.ts <<'EOF'
export {};
EOF

cat > tests/unit/create.test.ts <<'EOF'
import { describe, expect, test } from 'bun:test';
import { createEnum } from '../../src/create';

describe('createEnum (smoke)', () => {
  test('returns values/constants/names', () => {
    const E = createEnum(['foo-bar', 'stdout'] as const);

    expect(E.constants.FOO_BAR).toBe('foo-bar');
    expect(E.names.FooBar).toBe('foo-bar');
    expect(E.names.Stdout).toBe('stdout');
  });
});
EOF

cat > tests/integration/zod.test.ts <<'EOF'
import { describe, test } from 'bun:test';

describe('zod integration (placeholder)', () => {
  test('reserved', () => {});
});
EOF

echo "✅ Scaffold done."
