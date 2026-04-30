import { strict } from 'node:assert'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function ok(step) {
  console.log(`✓ ${step}`)
}

function assertPublicSurface(module, expectedExports) {
  strict.deepEqual(Object.keys(module).sort(), [...expectedExports].sort())
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

// 3) Public surface sanity
{
  const cjs = require('../dist/index.cjs')
  const esm = await import('../dist/index.mjs')

  const expectedExports = [
    'ZenumsError',
    'createEnum',
    'toConstKey',
    'toNameKey',
  ]

  assertPublicSurface(cjs, expectedExports)
  assertPublicSurface(esm, expectedExports)

  ok('Public API: only intended exports are exposed')
}

// 4) zod subpath loads in CJS + ESM
{
  const cjs = require('../dist/zod.cjs')
  const esm = await import('../dist/zod.mjs')

  strict.equal(typeof cjs.toZodEnum, 'function')
  strict.equal(typeof esm.toZodEnum, 'function')

  assertPublicSurface(cjs, ['toZodEnum'])
  assertPublicSurface(esm, ['toZodEnum'])

  ok('Subpath ./zod: CJS/ESM modules load')
}

// 5) If zod is available, toZodEnum works (optional peer)
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
