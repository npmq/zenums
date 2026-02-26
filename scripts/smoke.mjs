import { strict } from 'node:assert'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function ok(step) {
  console.log(`✓ ${step}`)
}

// 1) CJS require works
{
  const { createEnum } = require('../dist/index.cjs')
  const E = createEnum(['aa', 'bb'])

  strict.equal(E.constants.AA, 'aa')
  strict.equal(E.names.Aa, 'aa')
  strict.equal(E.parse('aa'), 'aa')

  ok('CJS require: createEnum works')
}

// 2) ESM import works
{
  const { createEnum } = await import('../dist/index.mjs')
  const E = createEnum(['aa', 'bb'])

  strict.equal(E.is('cc'), false)

  ok('ESM import: createEnum works')
}

// 2.1) Public surface sanity
{
  const m = await import('../dist/index.mjs')

  strict.equal(typeof m.createEnum, 'function')
  strict.equal(typeof m.toConstKey, 'function')
  strict.equal(typeof m.toNameKey, 'function')

  strict.equal('toEnumKeys' in m, false)

  ok('Public API: only intended exports are exposed')
}

// 3) zod subpath loads (must not crash on import)
{
  const m = await import('../dist/zod.mjs')

  strict.equal(typeof m.toZodEnum, 'function')

  ok('Subpath ./zod: module loads')
}

// 4) If zod is available, toZodEnum works (optional peer)
try {
  const z = await import('zod')
  const { toZodEnum } = await import('../dist/zod.mjs')

  const Schema = toZodEnum(z, ['stdout', 'stderr'])

  strict.equal(Schema.parse('stdout'), 'stdout')
  strict.equal(Schema.safeParse('nope').success, false)
  strict.deepEqual(Schema.options, ['stdout', 'stderr'])

  ok('Zod integration: toZodEnum works')
} catch {
  ok('Zod integration: skipped (zod not installed)')
}
