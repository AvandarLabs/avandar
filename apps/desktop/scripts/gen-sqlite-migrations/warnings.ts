/*
 * Operator-facing output for the generator: the per-file header at the
 * top of every `.gen.sql`, plus the two end-of-run notices (yellow for
 * hand-edits the engineer must apply, cyan for FK constraints we
 * dropped because their target is not synced).
 */

import type { AnnotatedStatement, PartitionResult } from "./types";

const _ANSI_YELLOW = "\x1b[33m";
const _ANSI_CYAN = "\x1b[36m";
const _ANSI_BOLD = "\x1b[1m";
const _ANSI_RESET = "\x1b[0m";

/**
 * Build the comment block placed at the top of every generated
 * `.gen.sql`. Lists per-file counts so reviewers can see at a glance
 * how each Postgres migration was processed.
 *
 * @param args - Source Postgres filename + per-file partition counts.
 * @returns A multi-line `--` comment block (no trailing newline).
 */
export function buildHeader(
  args: Readonly<{ sourceFile: string; partition: PartitionResult }>,
): string {
  const { sourceFile, partition } = args;
  return [
    `-- Generated from supabase/migrations/${sourceFile} by`,
    "-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand",
    "-- unless the matching `needs hand-edit` warning calls for it.",
    `-- Schema-shape statements emitted: ${partition.included.length}`,
    `-- Statements dropped (RLS/funcs/triggers/data/etc.): ${partition.skipped.length}`,
    `-- FK constraints dropped (target not synced to SQLite): ${partition.droppedForeignKeys.length}`,
    `-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): ${partition.needsHandEdit.length}`,
  ].join("\n");
}

/**
 * Print the yellow end-of-run warning listing statements SQLite cannot
 * accept as written and which need to be inlined into the matching
 * `.gen.sql` by hand.
 *
 * @param items - Per-source statements that landed in
 *   `partition.needsHandEdit`.
 */
export function printHandEditWarning(
  items: readonly AnnotatedStatement[],
): void {
  const header = `${_ANSI_BOLD}${_ANSI_YELLOW}\u26a0  ${items.length} statement(s) could not be transpiled and need a hand-edit${_ANSI_RESET}`;
  const blurb = `${_ANSI_YELLOW}SQLite's ALTER TABLE supports RENAME / ADD COLUMN / DROP COLUMN only. Postgres-style \`ALTER TABLE ... ADD CONSTRAINT ...\` (FK, CHECK, PRIMARY KEY, UNIQUE) cannot be transpiled, so the constraints below were dropped from the generated output. To preserve them on the SQLite side, open the matching \`apps/desktop/migrations/<source>.gen.sql\` and inline each constraint into the CREATE TABLE for the affected table (column-level \`REFERENCES\`, table-level \`FOREIGN KEY\`, or a \`CHECK (...)\` clause).${_ANSI_RESET}`;
  const bullets = items.map((item) => {
    const fkTargets = item.statement.fkReferences
      .map((ref) => {
        return ref.schema === undefined ?
            ref.table
          : `${ref.schema}.${ref.table}`;
      })
      .join(", ");
    const preview = item.statement.sql.replace(/\s+/g, " ").slice(0, 200);
    const ellipsis = item.statement.sql.length > 200 ? "..." : "";
    return `${_ANSI_YELLOW}  - ${item.sourceFile}\n      table: ${item.statement.primaryTable ?? "?"}, references: ${fkTargets}\n      ${preview}${ellipsis}${_ANSI_RESET}`;
  });
  console.warn("");
  console.warn(header);
  console.warn(blurb);
  console.warn("");
  bullets.forEach((line) => {
    console.warn(line);
  });
  console.warn("");
}

/**
 * Print the cyan informational notice listing FK constraints that were
 * dropped because their target table is not part of the SQLite mirror
 * (cross-schema reference like `auth.users`, or target in
 * `EXCLUDED_TABLES`). No hand-edit is required; the column itself is
 * preserved, only the FK is gone.
 *
 * @param args - Per-source dropped FK statements, plus the manifest
 *   snapshots used to classify each drop reason.
 */
export function printDroppedFkInfo(
  args: Readonly<{
    items: readonly AnnotatedStatement[];
    syncable: readonly string[];
    excluded: readonly string[];
  }>,
): void {
  const { items, syncable, excluded } = args;
  const syncableSet = new Set(syncable);
  const excludedSet = new Set(excluded);
  const header = `${_ANSI_BOLD}${_ANSI_CYAN}\u2139  ${items.length} FK constraint(s) were dropped because their target table is not part of the SQLite mirror${_ANSI_RESET}`;
  const blurb = `${_ANSI_CYAN}No hand-edit is required for these. The underlying column is preserved in the generated CREATE TABLE; only the FK constraint is gone, because SQLite has no table to reference. If you need runtime integrity for any of these columns, enforce it at the application or sync-engine layer (the sync engine is the canonical place to ensure the referenced row exists before insert).\n\nWhy each FK was dropped:\n  - cross-schema target (e.g. \`REFERENCES auth.users\`): the auth schema does not exist on SQLite.\n  - excluded target: the referenced table is in \`EXCLUDED_TABLES\` and is intentionally not synced to desktop.${_ANSI_RESET}`;
  const bullets = items.map((item) => {
    const refs = item.statement.fkReferences
      .filter((ref) => {
        if (ref.schema !== undefined) {
          return true;
        }
        return !syncableSet.has(ref.table);
      })
      .map((ref) => {
        const target =
          ref.schema === undefined ? ref.table : `${ref.schema}.${ref.table}`;
        const reason =
          ref.schema !== undefined ? "cross-schema"
          : excludedSet.has(ref.table) ? "excluded from sync"
          : "target table not in SYNCABLE_TABLES";
        return `${target} (${reason})`;
      })
      .join(", ");
    return `${_ANSI_CYAN}  - ${item.sourceFile}: ${item.statement.primaryTable ?? "?"} -> ${refs}${_ANSI_RESET}`;
  });
  console.warn("");
  console.warn(header);
  console.warn(blurb);
  console.warn("");
  bullets.forEach((line) => {
    console.warn(line);
  });
  console.warn("");
}
