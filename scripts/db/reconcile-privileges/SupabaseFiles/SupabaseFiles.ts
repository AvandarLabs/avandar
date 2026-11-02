import { appendFileSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Schema files in the order the Supabase CLI applies them.
 *
 * `[db.migrations] schema_paths` is empty in this repo, and the CLI's
 * documented
 * default for that is every file under `supabase/schemas/` in lexicographic
 * order. That order is load-bearing: `00.default_privileges.sql` has to run
 * before the files whose relations it keeps private.
 */
function _getOrderedSchemaFiles(repoRoot: string): string[] {
  const schemasDir = path.join(repoRoot, "supabase", "schemas");
  const walk = (dir: string): string[] => {
    return readdirSync(dir)
      .sort()
      .flatMap((name) => {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) {
          return walk(full);
        }
        return name.endsWith(".sql") ? [full] : [];
      });
  };
  return walk(schemasDir);
}

function _getNewestMigrationPath(repoRoot: string): string {
  const migrationsDir = path.join(repoRoot, "supabase", "migrations");
  const newest = readdirSync(migrationsDir)
    .filter((name) => {
      return name.endsWith(".sql");
    })
    .sort()
    .at(-1);
  if (newest === undefined) {
    throw new Error("No migrations found.");
  }
  return path.join(migrationsDir, newest);
}

function _appendStatementsToMigration(
  options: Readonly<{ migrationFile: string; statements: readonly string[] }>,
): void {
  const { migrationFile, statements } = options;
  const block = [
    "",
    "-- Privileges that `supabase db diff` cannot see: default, schema, column,",
    "-- and view grants. Appended by `pnpm db:new-migration` from what",
    "-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.",
    ...statements,
    "",
  ].join("\n");
  appendFileSync(migrationFile, block);
  console.log(
    `Appended ${statements.length} statement(s) to ${path.basename(migrationFile)}.`,
  );
}

/**
 * The `supabase/` files this tool reads and writes.
 *
 * Split out from the entry point so the one member that MUTATES a file,
 * `appendStatementsToMigration`, sits next to the two that only read, instead
 * of being buried in a script whose other members all just build strings.
 */
export const SupabaseFiles = {
  /** Schema files in the order the Supabase CLI applies them. */
  getOrderedSchemaFiles: _getOrderedSchemaFiles,

  /** Reads a schema or migration file as UTF-8 text. */
  readFile: (file: string): string => {
    return readFileSync(file, "utf8");
  },

  /** Path of the newest migration by timestamp prefix. */
  getNewestMigrationPath: _getNewestMigrationPath,

  /**
   * Appends privilege statements to a migration, under a header explaining
   * where they came from.
   */
  appendStatementsToMigration: _appendStatementsToMigration,
};
