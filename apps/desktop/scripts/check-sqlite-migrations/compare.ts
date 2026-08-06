/*
 * Pure-function diff of two `Map<filename, contents>` snapshots, used
 * by the check script to compare freshly-regenerated `.gen.sql` files
 * against what's committed. Keeping the diff logic in its own module
 * lets it be unit-tested without touching the filesystem or sqlglot.
 */

/**
 * One human-readable diff entry produced by {@link compare}.
 *
 * - `kind` follows the standard `+/-/~` convention (added, removed,
 *   changed).
 * - `name` is the file basename (relative to the migrations directory).
 */
export type DiffEntry = {
  kind: "added" | "removed" | "changed";
  name: string;
};

/**
 * Diff two filename->content maps and return a stable, sorted list of
 * differences. The shapes are deliberately small and easy to construct
 * in tests; the real check script builds them from the filesystem.
 *
 * @param args - The committed map (on-disk truth) and the freshly
 *   regenerated map.
 * @returns Sorted by filename. Empty when the two maps are identical.
 */
export function compare(
  args: Readonly<{
    committed: ReadonlyMap<string, string>;
    fresh: ReadonlyMap<string, string>;
  }>,
): DiffEntry[] {
  const { committed, fresh } = args;
  const diffs: DiffEntry[] = [];
  const allNames = new Set<string>([...committed.keys(), ...fresh.keys()]);
  [...allNames].sort().forEach((name) => {
    const committedContent = committed.get(name);
    const freshContent = fresh.get(name);
    if (committedContent === undefined) {
      diffs.push({ kind: "added", name });
      return;
    }
    if (freshContent === undefined) {
      diffs.push({ kind: "removed", name });
      return;
    }
    if (committedContent !== freshContent) {
      diffs.push({ kind: "changed", name });
    }
  });
  return diffs;
}

/**
 * Render a {@link DiffEntry} into the line the script prints to stderr.
 *
 * @param entry - One diff entry.
 * @returns A human-readable `+/-/~ <name> (<reason>)` line.
 */
export function formatDiff(entry: Readonly<DiffEntry>): string {
  if (entry.kind === "added") {
    return `+ ${entry.name} (regenerated but not committed)`;
  }
  if (entry.kind === "removed") {
    return `- ${entry.name} (committed but no longer generated)`;
  }
  return `~ ${entry.name} (content differs from regeneration)`;
}
