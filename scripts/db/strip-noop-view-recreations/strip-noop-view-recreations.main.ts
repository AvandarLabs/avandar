/**
 * Removes no-op view recreations from a generated migration.
 *
 * WHY THIS EXISTS
 *
 * `supabase db diff` with the migra engine emits a `drop view if exists` plus
 * an identical `create or replace view` for every `analytics.*` view on EVERY
 * run, including runs with no pending schema change at all. Applying them
 * changes nothing, so the next diff proposes them again. It never converges,
 * and every migration in the repo inherits roughly 250 lines of noise.
 *
 * WHY THIS IS NOT THE HAND-TRIMMING THIS REPO WARNS ABOUT
 *
 * `90.analytics_schema.sql` says never to hand-edit a generated migration, and
 * that stands: editing by eye means deciding which of hundreds of statements
 * are legitimate, and a wrong call ships a database that no longer matches
 * `supabase/schemas/`. This script is the opposite of judgement by eye. It
 * removes a statement only when POSTGRES ITSELF confirms the proposed
 * definition normalises to exactly the definition already in the database.
 *
 * Comparing SQL text would not do. The declarative files are hand-formatted
 * lowercase; migra emits Postgres's canonical form; and `pg_get_viewdef`
 * renders schema qualification differently depending on `search_path`. So the
 * check hands the proposed body back to Postgres, builds it as a throwaway
 * view, and compares `pg_get_viewdef` of both in ONE session, where every
 * rendering decision is identical by construction. Equal output means equal
 * parse tree means applying the statement is a no-op.
 *
 * SAFETY RULES, in order of importance
 *
 * 1. Anything it cannot positively prove is a no-op is KEPT. A parse failure, a
 *    connection failure, a view that does not exist yet, a definition that
 *    differs: all keep the statements and say so.
 * 2. A `drop view` is removed only when its paired `create or replace view` was
 *    also proven a no-op. A drop with no matching create is a real deletion.
 * 3. It refuses to touch a migration that has already been applied. Comparing
 *    against a database that already contains the change would call a real view
 *    change a no-op and silently strip it, breaking a from-scratch replay.
 * 4. Statements it keeps are preserved byte-for-byte. It deletes source ranges
 *    rather than re-serialising the file.
 *
 * The decision rules live in `NoopViewRecreations/NoopViewRecreations.ts` and
 * are covered by `NoopViewRecreations/NoopViewRecreations.test.ts`. This file
 * holds only the database check and the wiring.
 *
 * USAGE
 *
 *   pnpm db:strip-noop-views [migration-file] [--dry-run]
 *
 * With no file it takes the newest migration. `--dry-run` reports and changes
 * nothing.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { getProjectIdFromConfig, makeSqlRunner } from "../lib/psql";
import { NoopViewRecreations } from "./NoopViewRecreations/NoopViewRecreations";
import type {
  CreateViewStatement,
  Decision,
  NoopVerdict,
  Statement,
} from "./NoopViewRecreations/NoopViewRecreations";

const PROBE_SCHEMA = "_noop_view_check";

function _doesLiveViewExist(
  options: Readonly<{ runSql: (sql: string) => string; qualified: string }>,
): boolean {
  const { runSql, qualified } = options;
  return (
    runSql(
      `select to_regclass(${quoteSqlLiteral(qualified)}) is not null;`,
    ).trim() === "t"
  );
}

function _getBooleanFromPsqlOutput(output: string): boolean | undefined {
  const verdict = output
    .split("\n")
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line === "t" || line === "f";
    })
    .at(-1);
  return verdict === undefined ? undefined : verdict === "t";
}

function _getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0] ?? message;
}

function _getNoopVerdictFromCreate(
  options: Readonly<{
    runSql: (sql: string) => string;
    create: Readonly<CreateViewStatement>;
  }>,
): NoopVerdict {
  const { runSql, create } = options;
  const qualified = `${quoteSqlIdentifier(create.view.schema)}.${quoteSqlIdentifier(
    create.view.name,
  )}`;

  if (!_doesLiveViewExist({ runSql, qualified })) {
    return {
      isNoop: false,
      reason: "view does not exist yet, so this creates it",
    };
  }

  // Build the proposed definition as a throwaway view and compare
  // `pg_get_viewdef` of both in one rolled-back transaction.
  const probe = `${PROBE_SCHEMA}.${quoteSqlIdentifier(create.view.name)}`;
  const sql = [
    "begin;",
    `create schema ${PROBE_SCHEMA};`,
    `create view ${probe} as ${create.viewBody};`,
    `select pg_get_viewdef(${quoteSqlLiteral(qualified)}::regclass)`,
    `     = pg_get_viewdef(${quoteSqlLiteral(probe)}::regclass);`,
    "rollback;",
  ].join("\n");

  try {
    const isIdentical = _getBooleanFromPsqlOutput(runSql(sql));
    return isIdentical === true ?
        { isNoop: true, reason: "definition is identical to the live view" }
      : { isNoop: false, reason: "definition differs from the live view" };
  } catch (error) {
    return {
      isNoop: false,
      reason: `could not verify (${_getErrorMessage(error)})`,
    };
  }
}

/**
 * Whether installing this definition over the live view would change anything.
 * The check runs in a rolled-back transaction, so the database is untouched.
 */
function _makeNoopCheck(
  runSql: (sql: string) => string,
): (create: Readonly<CreateViewStatement>) => NoopVerdict {
  return (create) => {
    return _getNoopVerdictFromCreate({ runSql, create });
  };
}

function _getMigrationFilePath(
  options: Readonly<{ repoRoot: string; explicitFile: string | undefined }>,
): string {
  const { repoRoot, explicitFile } = options;
  if (explicitFile !== undefined) {
    return explicitFile;
  }
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

/**
 * Whether the local database already has this migration version recorded, or
 * `undefined` when the database could not be reached.
 */
function _isMigrationAlreadyApplied(
  options: Readonly<{ runSql: (sql: string) => string; version: string }>,
): boolean | undefined {
  const { runSql, version } = options;
  try {
    return (
      runSql(
        `select exists (select 1 from supabase_migrations.schema_migrations
         where version = ${quoteSqlLiteral(version)});`,
      ).trim() === "t"
    );
  } catch (error) {
    console.log(
      `SKIPPED: could not reach the local database (${_getErrorMessage(error)}). Leaving the migration untouched.`,
    );
    return undefined;
  }
}

function _getCliOptionsFromArgv(argv: readonly string[]): {
  isDryRun: boolean;
  explicitFile: string | undefined;
} {
  return {
    isDryRun: argv.includes("--dry-run"),
    explicitFile: argv.find((arg) => {
      return !arg.startsWith("--");
    }),
  };
}

function _logDecisions(decisions: readonly Decision[]): void {
  decisions.forEach((decision) => {
    const label = decision.isRemoved ? "REMOVE" : "KEEP  ";
    const key = NoopViewRecreations.getViewKeyFromView(decision.view);
    console.log(`  ${label}  ${key}  (${decision.reason})`);
  });
}

type WriteMigrationOptions = Readonly<{
  migrationFile: string;
  original: string;
  output: string;
  removalCount: number;
  isDryRun: boolean;
}>;

function _writeOrReportMigration(options: WriteMigrationOptions): void {
  const { migrationFile, original, output, removalCount, isDryRun } = options;
  const linesSaved = original.split("\n").length - output.split("\n").length;
  if (isDryRun) {
    console.log(
      `--dry-run: would remove ${removalCount} statement(s), ${linesSaved} line(s).`,
    );
    return;
  }
  writeFileSync(migrationFile, output);
  console.log(
    `Removed ${removalCount} provably redundant statement(s), ${linesSaved} line(s).`,
  );
}

function _shouldAbortBeforePlanning(
  options: Readonly<{
    statements: readonly Statement[];
    runSql: (sql: string) => string;
    version: string;
  }>,
): boolean {
  const { statements, runSql, version } = options;
  const hasViewRecreation = statements.some((statement) => {
    return (
      NoopViewRecreations.getCreateViewFromStatement(statement) !== undefined
    );
  });
  if (!hasViewRecreation) {
    console.log("No view recreations found. Nothing to do.");
    return true;
  }

  // Refuse on an already-applied migration: the comparison would then be
  // against a database that already contains the change, so a REAL view change
  // would look like a no-op and be silently stripped.
  const isAlreadyApplied = _isMigrationAlreadyApplied({ runSql, version });
  if (isAlreadyApplied === undefined) {
    return true;
  }
  if (isAlreadyApplied) {
    console.log(
      `SKIPPED: migration ${version} is already applied, so a no-op check against the live database would not be trustworthy. Run this before applying, or reset first.`,
    );
    return true;
  }
  return false;
}

function main(): void {
  const { isDryRun, explicitFile } = _getCliOptionsFromArgv(
    process.argv.slice(2),
  );
  const repoRoot = process.cwd();
  const migrationFile = _getMigrationFilePath({ repoRoot, explicitFile });
  const original = readFileSync(migrationFile, "utf8");
  const statements = NoopViewRecreations.getStatementsFromSql(original);
  const runSql = makeSqlRunner(getProjectIdFromConfig(repoRoot));

  console.log(`Migration: ${path.basename(migrationFile)}`);
  if (
    _shouldAbortBeforePlanning({
      statements,
      runSql,
      version: path.basename(migrationFile).split("_")[0] ?? "",
    })
  ) {
    return;
  }

  const { removals, decisions } = NoopViewRecreations.planRemovals({
    statements,
    isNoop: _makeNoopCheck(runSql),
  });
  _logDecisions(decisions);
  if (removals.length === 0) {
    console.log("Nothing provably redundant. Migration left untouched.");
    return;
  }

  _writeOrReportMigration({
    migrationFile,
    original,
    output: NoopViewRecreations.applyRemovals({ original, removals }),
    removalCount: removals.length,
    isDryRun,
  });
}

main();
