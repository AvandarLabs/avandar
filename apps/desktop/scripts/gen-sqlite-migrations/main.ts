/*
 * Entry point for `pnpm desktop:sqlite:gen-migrations`. Resolves the
 * repo-relative source / output directories and delegates to
 * `runGenerator`. Kept tiny on purpose: every other concern lives in
 * its own module under this directory.
 *
 * Architecture overview (read these in order to follow the pipeline):
 *   - `parse.ts` - split a `.sql` blob into statements, classify each
 *     by leading keyword, pull out the primary table and FK references.
 *   - `partition.ts` - bucket each statement against the manifest:
 *     keep, skip, drop the FK, queue for hand-edit, or hard-error.
 *   - `transpile.ts` - shell out to sqlglot via uv, then strip
 *     Postgres-isms sqlglot leaves behind.
 *   - `warnings.ts` - the per-file header comment and the yellow /
 *     cyan end-of-run notices.
 *   - `runGenerator.ts` - the orchestration loop everything else
 *     plugs into.
 *
 * `sqlglot` is a developer-machine dependency only (Python, resolved
 * by uv). It is not an npm dependency and not bundled into the web or
 * desktop runtime. Nothing under `src/`, `shared/`, or `packages/`
 * imports anything from this directory.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGenerator } from "./runGenerator/runGenerator";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..", "..");
const PG_MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const SQLITE_MIGRATIONS_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

const summary = runGenerator({
  sourceDirectory: PG_MIGRATIONS_DIR,
  outputDirectory: SQLITE_MIGRATIONS_DIR,
});

console.log(
  `[gen-sqlite-migrations] wrote ${summary.filesWritten} files; included ${summary.statementsIncluded} statements, skipped ${summary.statementsSkipped}`,
);
