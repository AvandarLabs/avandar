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
 * The decision rules live in `noopViewRecreations.ts` and are covered by
 * `noopViewRecreations.test.ts`. This file holds only the database check and
 * the wiring, which is why it is deliberately thin.
 *
 * USAGE
 *
 *   pnpm db:strip-noop-views [migration-file] [--dry-run]
 *
 * With no file it takes the newest migration. `--dry-run` reports and changes
 * nothing.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NoopViewRecreations } from "./noopViewRecreations";
import type { CreateViewStatement, NoopVerdict } from "./noopViewRecreations";

const PROBE_SCHEMA = "_noop_view_check";

/**
 * Runs SQL against the local database.
 *
 * Prefers `psql`, matching `scripts/test-dashboard-publishing-migrations.sh`.
 * Falls back to `psql` inside the Supabase container, because not every
 * machine that runs this repo has a local Postgres client installed.
 */
function makeSqlRunner(projectId: string): (sql: string) => string {
  const commonArgs = [
    "--username",
    "postgres",
    "--dbname",
    "postgres",
    "--no-psqlrc",
    "--tuples-only",
    "--no-align",
    "--set=ON_ERROR_STOP=on",
  ];

  // On the host, Postgres is published on 54322. Inside the container it
  // listens on its own 5432, so the host port would refuse the connection.
  const hostArgs = ["--host", "127.0.0.1", "--port", "54322", ...commonArgs];
  const containerArgs = [
    "--host",
    "127.0.0.1",
    "--port",
    "5432",
    ...commonArgs,
  ];

  const run = (file: string, args: string[], sql: string): string => {
    return execFileSync(file, [...args, "--command", sql], {
      encoding: "utf8",
      env: { ...process.env, PGPASSWORD: "postgres" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  };

  let useDocker: boolean | undefined = undefined;

  return (sql: string): string => {
    if (useDocker === undefined) {
      try {
        run("psql", hostArgs, "select 1");
        useDocker = false;
      } catch {
        useDocker = true;
      }
    }
    if (!useDocker) {
      return run("psql", hostArgs, sql);
    }
    return run(
      "docker",
      [
        "exec",
        "-e",
        "PGPASSWORD=postgres",
        `supabase_db_${projectId}`,
        "psql",
        ...containerArgs,
      ],
      sql,
    );
  };
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Whether installing this definition over the live view would change anything.
 *
 * Builds the proposed definition as a throwaway view and asks Postgres whether
 * the two normalise identically. Everything happens inside a transaction that
 * is rolled back, so the database is untouched either way.
 */
function makeNoopCheck(
  runSql: (sql: string) => string,
): (create: CreateViewStatement) => NoopVerdict {
  return (create) => {
    const qualified = `${quoteIdentifier(create.view.schema)}.${quoteIdentifier(
      create.view.name,
    )}`;

    const exists = runSql(
      `select to_regclass(${quoteLiteral(qualified)}) is not null;`,
    ).trim();
    if (exists !== "t") {
      return {
        isNoop: false,
        reason: "view does not exist yet, so this creates it",
      };
    }

    const probe = `${PROBE_SCHEMA}.${quoteIdentifier(create.view.name)}`;
    const sql = [
      "begin;",
      `create schema ${PROBE_SCHEMA};`,
      `create view ${probe} as ${create.viewBody};`,
      `select pg_get_viewdef(${quoteLiteral(qualified)}::regclass)`,
      `     = pg_get_viewdef(${quoteLiteral(probe)}::regclass);`,
      "rollback;",
    ].join("\n");

    let output: string;
    try {
      output = runSql(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isNoop: false,
        reason: `could not verify (${message.split("\n")[0]})`,
      };
    }

    const verdict = output
      .split("\n")
      .map((line) => {
        return line.trim();
      })
      .filter((line) => {
        return line === "t" || line === "f";
      })
      .at(-1);

    return verdict === "t" ?
        { isNoop: true, reason: "definition is identical to the live view" }
      : { isNoop: false, reason: "definition differs from the live view" };
  };
}

function resolveMigrationFile(
  repoRoot: string,
  explicitFile: string | undefined,
): string {
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

function main(): void {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const explicitFile = args.find((arg) => {
    return !arg.startsWith("--");
  });

  const repoRoot = process.cwd();
  const migrationFile = resolveMigrationFile(repoRoot, explicitFile);
  const projectId =
    /^project_id\s*=\s*"([^"]+)"/m.exec(
      readFileSync(path.join(repoRoot, "supabase", "config.toml"), "utf8"),
    )?.[1] ?? "avandar";

  const original = readFileSync(migrationFile, "utf8");
  const statements = NoopViewRecreations.splitStatements(original);
  const hasViewRecreation = statements.some((statement) => {
    return NoopViewRecreations.asCreateView(statement) !== undefined;
  });

  console.log(`Migration: ${path.basename(migrationFile)}`);
  if (!hasViewRecreation) {
    console.log("No view recreations found. Nothing to do.");
    return;
  }

  const runSql = makeSqlRunner(projectId);

  // Refuse on an already-applied migration: the comparison below would then be
  // against a database that already contains the change, so a REAL view change
  // would look like a no-op and be silently stripped.
  const version = path.basename(migrationFile).split("_")[0] ?? "";
  try {
    const applied = runSql(
      `select exists (select 1 from supabase_migrations.schema_migrations
         where version = ${quoteLiteral(version)});`,
    ).trim();
    if (applied === "t") {
      console.log(
        `SKIPPED: migration ${version} is already applied, so a no-op check ` +
          "against the live database would not be trustworthy. Run this " +
          "before applying, or reset first.",
      );
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `SKIPPED: could not reach the local database ` +
        `(${message.split("\n")[0]}). Leaving the migration untouched.`,
    );
    return;
  }

  const { removals, decisions } = NoopViewRecreations.planRemovals({
    statements,
    isNoop: makeNoopCheck(runSql),
  });

  for (const decision of decisions) {
    const label = decision.isRemoved ? "REMOVE" : "KEEP  ";
    const key = NoopViewRecreations.viewKey(decision.view);
    console.log(`  ${label}  ${key}  (${decision.reason})`);
  }

  if (removals.length === 0) {
    console.log("Nothing provably redundant. Migration left untouched.");
    return;
  }

  const output = NoopViewRecreations.applyRemovals(original, removals);
  const linesSaved = original.split("\n").length - output.split("\n").length;

  if (isDryRun) {
    console.log(
      `--dry-run: would remove ${removals.length} statement(s), ` +
        `${linesSaved} line(s).`,
    );
    return;
  }

  writeFileSync(migrationFile, output);
  console.log(
    `Removed ${removals.length} provably redundant statement(s), ` +
      `${linesSaved} line(s).`,
  );
}

main();
