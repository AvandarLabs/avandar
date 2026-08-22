import type { Migration } from "../SqliteService/Sqlite";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Suffix the migration generator stamps onto every emitted file. Picked
 * up via this constant rather than a hard-coded literal so the runner
 * stays in step with `apps/desktop/scripts/gen-sqlite-migrations/`.
 */
const MIGRATION_FILE_SUFFIX = ".gen.sql";

/**
 * Loads every `.gen.sql` migration file out of `dir`, sorted by filename.
 *
 * The lexical sort matches the timestamp prefix the generator stamps on
 * each filename (e.g. `20250706214712_init_db.gen.sql`), which is the
 * same ordering the bookkeeping table in {@link runMigrations} expects.
 * Subdirectories and any file that does not end in `.gen.sql` are
 * ignored: README files and editor backups must not be applied.
 *
 * @param dir - Absolute path to a directory of generated migrations.
 * @returns The migration list, ready to pass to `runMigrations`.
 */
export function loadMigrationsFromDir(dir: string): readonly Migration[] {
  const entries = readdirSync(dir);
  const files = entries
    .filter((name) => {
      if (!name.endsWith(MIGRATION_FILE_SUFFIX)) {
        return false;
      }
      const stats = statSync(join(dir, name));
      return stats.isFile();
    })
    .sort();

  return files.map((name) => {
    return {
      name,
      sql: readFileSync(join(dir, name), "utf8"),
    };
  });
}
