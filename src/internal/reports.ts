import type {
  CollisionItem,
  EnumKeyKind,
  RejectedReport,
  RejectedStats,
} from '../types'
import { sorted, sortedStrings } from './determinism'

// Centralized section labels to keep formatting consistent and easy to tweak in one place
const LABELS = Object.freeze({
  rejected: 'Enum definition rejected.',
  stats: 'Stats:',
  details: 'Details:',
  invalid: 'Invalid:',
  duplicates: 'Duplicates:',
  collisions: (kind: EnumKeyKind) => `Collisions (${kind}):`,
} as const)

// Indentation tokens for stable visual hierarchy (keeps nesting consistent across all sections)
const INDENT = Object.freeze({
  l1: '  ',
  l2: '    ',
} as const)

// Line templates for report rendering (single source of truth for wording + spacing)
const TPL = Object.freeze({
  stat: (name: string, value: number | string) =>
    `${INDENT.l1}${name}: ${value}`,
  invalidItem: (index: number, code: string) =>
    `${INDENT.l1}• [${index}] ${code}`,
  duplicateItem: (value: string, indexes: readonly number[]) =>
    `${INDENT.l1}• '${value}' at indexes: ${indexes.join(', ')}`,
  collisionKey: (key: string) => `${INDENT.l1}Key '${key}' is produced by:`,
  collisionSource: (source: string) => `${INDENT.l2}• '${source}'`,
} as const)

// Comparator bundle for local consistency (keeps sorting rules in one place)

type InvalidEntry = RejectedReport['invalid'][number]
type DuplicateEntry = RejectedReport['duplicates'][number]

const byCollisionKey = (a: CollisionItem, b: CollisionItem) =>
  a.key.localeCompare(b.key)

const byInvalid = (a: InvalidEntry, b: InvalidEntry) =>
  a.index !== b.index ? a.index - b.index : a.code.localeCompare(b.code)

const byDuplicate = (a: DuplicateEntry, b: DuplicateEntry) =>
  a.value.localeCompare(b.value)

// Stable helpers for deterministic, snapshot-friendly output
function sortCollisionItems(
  items: readonly CollisionItem[],
): readonly CollisionItem[] {
  return Object.freeze(
    sorted(items, byCollisionKey).map(c =>
      Object.freeze({
        key: c.key,
        sources: sortedStrings(c.sources),
      }),
    ),
  )
}

// Appends one collision section with stable layout; no-op when there are no collisions for the kind
function pushCollisionSection(
  lines: string[],
  kind: EnumKeyKind,
  items: readonly CollisionItem[],
): void {
  if (items.length === 0) {
    return
  }

  lines.push('')
  lines.push(LABELS.collisions(kind))

  for (const c of items) {
    lines.push(TPL.collisionKey(c.key))

    for (const s of c.sources) {
      lines.push(TPL.collisionSource(s))
    }
  }
}

/**
 * Builds stable human-readable lines for the aggregated definitionRejected error.
 * Deterministic output: sorted invalids/duplicates + collision keys/sources for stable logs & snapshots
 */
export const buildDefinitionRejectedDetails = (
  report: RejectedReport,
  stats: RejectedStats,
): readonly string[] => {
  const lines: string[] = []

  // Summary first (most useful in logs)
  lines.push(LABELS.rejected)
  lines.push('')
  lines.push(LABELS.stats)
  lines.push(TPL.stat('received', stats.received))
  lines.push(TPL.stat('valid', stats.valid))
  lines.push(TPL.stat('invalid', stats.invalid))
  lines.push(TPL.stat('duplicates', stats.duplicates))
  lines.push(
    TPL.stat(
      'collisions',
      stats.collisions.total > 0
        ? `${stats.collisions.total} (constants: ${stats.collisions.constants}, names: ${stats.collisions.names})`
        : '0',
    ),
  )

  const hasAnything =
    report.invalid.length > 0 ||
    report.duplicates.length > 0 ||
    report.collisions.constants.length > 0 ||
    report.collisions.names.length > 0

  if (!hasAnything) {
    return Object.freeze(lines)
  }

  lines.push('')
  lines.push(LABELS.details)

  // Invalids (sorted by index, then code)
  if (report.invalid.length > 0) {
    lines.push(LABELS.invalid)

    const invalidSorted = sorted(report.invalid, byInvalid)

    for (const it of invalidSorted) {
      lines.push(TPL.invalidItem(it.index, it.code))
    }
  }

  // Duplicates (sorted by value)
  if (report.duplicates.length > 0) {
    if (report.invalid.length > 0) {
      lines.push('')
    }

    lines.push(LABELS.duplicates)

    const dupSorted = sorted(report.duplicates, byDuplicate)

    for (const d of dupSorted) {
      lines.push(TPL.duplicateItem(d.value, d.indexes))
    }
  }

  // Collisions (already deterministic in collectors, but we normalize again for safety)
  const constants = sortCollisionItems(report.collisions.constants)
  const names = sortCollisionItems(report.collisions.names)

  pushCollisionSection(lines, 'constants', constants)
  pushCollisionSection(lines, 'names', names)

  return Object.freeze(lines)
}
