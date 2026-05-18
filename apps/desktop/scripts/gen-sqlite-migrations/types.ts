/*
 * Shared types for the Postgres -> SQLite migration generator. Lives in
 * its own module so every step of the pipeline (parse, partition,
 * transpile, warn) can import without pulling in the other modules.
 */

/**
 * What kind of Postgres statement we are looking at, from the desktop
 * mirror's perspective.
 *
 * - `schema-shape`: CREATE/ALTER/DROP TABLE, CREATE/DROP INDEX, or any
 *   other statement that defines the table layout the SQLite mirror
 *   needs. These are what we transpile and emit.
 * - `drop`: Postgres-only construct that has no SQLite equivalent or
 *   would not be useful locally (RLS policies, PL/pgSQL functions,
 *   triggers, GRANT/REVOKE, COMMENT, SET, CREATE EXTENSION, ENUM types,
 *   `ENABLE/DISABLE ROW LEVEL SECURITY`, `VALIDATE CONSTRAINT`). The
 *   generator silently discards these.
 * - `unknown`: leading keyword we do not recognise. The generator
 *   hard-errors so the classifier gets extended for the new syntax.
 */
export type StatementKind = "schema-shape" | "drop" | "unknown";

/**
 * A foreign-key reference extracted from a schema-shape statement.
 * `schema` is `undefined` for unqualified or `public.` references; any
 * other value means the FK targets a different Postgres schema (e.g.
 * `auth.users`), which the SQLite mirror cannot satisfy.
 */
export type FkReference = {
  schema: string | undefined;
  table: string;
};

/**
 * A single SQL statement extracted from a Postgres migration, enriched
 * with the metadata the partition step needs:
 *
 * - `kind` decides whether the statement makes it to SQLite at all.
 * - `primaryTable` keys `schema-shape` statements against the
 *   `SYNCABLE_TABLES` / `EXCLUDED_TABLES` manifest.
 * - `fkReferences` lets the partition step drop FK constraints whose
 *   target table does not exist locally (cross-schema or excluded).
 */
export type Statement = {
  sql: string;
  kind: StatementKind;
  primaryTable: string | undefined;
  fkReferences: FkReference[];
};

/**
 * Result of partitioning a batch of statements against the manifest.
 *
 * - `included`: write to the `.gen.sql` output as-is (after sqlglot).
 * - `skipped`: discard silently (Postgres-only or table is excluded).
 * - `droppedFks`: schema-shape statements whose FK target is not part
 *   of the SQLite mirror (cross-schema reference like `auth.users`, or
 *   target table is in `EXCLUDED_TABLES`). The generator drops the
 *   whole statement because the target table does not exist locally;
 *   no hand-edit can recover this. The column itself is preserved
 *   wherever it was declared; only the FK constraint is gone. Surfaced
 *   in a cyan informational notice so reviewers see the lost
 *   constraint.
 * - `needsHandEdit`: schema-relevant but SQLite cannot accept the
 *   statement as written; the generator prints a yellow warning so a
 *   human can inline the change into the right `.gen.sql` file. Today
 *   the cases are `ALTER TABLE ... ADD CONSTRAINT ...` (FK, CHECK, PK,
 *   UNIQUE) and `ALTER TABLE ... ALTER COLUMN ...`, neither of which
 *   SQLite's ALTER TABLE supports.
 * - `unknown`: blocks generation; the classifier or the manifest
 *   needs to grow before this run can succeed.
 */
export type PartitionResult = {
  included: Statement[];
  skipped: Statement[];
  droppedFks: Statement[];
  needsHandEdit: Statement[];
  unknown: Statement[];
};

/**
 * Options for `partitionStatements`.
 */
export type PartitionStatementsOptions = {
  statements: Statement[];
  syncable: string[];
  excluded: string[];
};

/**
 * A statement aggregated from a per-file partition result, paired with
 * the source migration file it came from. Used for both the yellow
 * hand-edit warning and the cyan dropped-FK informational notice.
 */
export type AnnotatedStatement = {
  sourceFile: string;
  statement: Statement;
};

/**
 * Summary returned by `runGenerator`, used by the entry-point script and
 * by the check-sqlite-migrations drift script.
 */
export type GeneratorSummary = {
  filesWritten: number;
  statementsIncluded: number;
  statementsSkipped: number;
  needsHandEdit: AnnotatedStatement[];
  droppedFks: AnnotatedStatement[];
};
