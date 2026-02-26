/* Determinism helpers: return frozen copies for stable logs/snapshots
   Contract: never mutate inputs; always return new frozen arrays */

export const sorted = <T>(
  items: readonly T[],
  compare: (a: T, b: T) => number,
): readonly T[] => {
  return Object.freeze([...items].sort(compare))
}

export const sortedStrings = (items: readonly string[]): readonly string[] => {
  return Object.freeze([...items].sort((a, b) => a.localeCompare(b)))
}

// Keeps first occurrence by key, then sorts deterministically
export const sortedUniqBy = <T>(
  items: readonly T[],
  key: (item: T) => string,
  compare: (a: T, b: T) => number,
): readonly T[] => {
  const seen = new Set<string>()
  const uniq: T[] = []

  for (const it of items) {
    const k = key(it)

    if (seen.has(k)) {
      continue
    }

    seen.add(k)
    uniq.push(it)
  }

  return Object.freeze([...uniq].sort(compare))
}
