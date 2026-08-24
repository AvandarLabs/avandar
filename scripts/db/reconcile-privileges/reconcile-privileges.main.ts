/**
 * Reconciles the local database's privileges with what `supabase/schemas/`
 * declares, and emits the exact SQL for any gap.
 *
 * WHY THIS EXISTS
 *
 * `supabase db diff` is not a complete ACL reconciler, and the gaps are not
 * guesses. Each row below was measured by putting one deliberate delta into
 * `supabase/schemas/` and reading what the diff emitted:
 *
 *   table grant added or removed ....... migra emits it
 *   column privileges ................. migra emits NOTHING
 *   schema privileges ................. migra emits NOTHING
 *   view grants ....................... migra emits NOTHING
 *   alter default privileges .......... migra emits NOTHING
 *
 * The last four are exactly the categories this repo depends on:
 * `00.default_privileges.sql` is what keeps every new relation private, and it
 * is invisible to the diff. Without this script, a change to it produces an
 * empty migration and the database silently keeps the old, permissive default.
 *
 * HOW IT DECIDES
 *
 * It never parses a `grant` statement to work out what it means. Postgres does
 * that. In ONE rolled-back transaction it:
 *
 *   1. strips relation, column, and schema privileges for the four Data API
 *      grantees back to the state a freshly created object has,
 *   2. replays every privilege declaration from `supabase/schemas/`, in the
 *      order the CLI applies those files,
 *   3. reads the resulting ACLs out of the catalogs, and
 *   4. rolls back.
 *
 * Step 3 is therefore the ACL a from-scratch schema build produces. Comparing
 * it
 * with the ACL the database actually has yields the missing statements.
 *
 * Functions and default privileges are deliberately NOT stripped in step 1.
 * Their declarations are absolute (`revoke ... from public, anon,
 * authenticated,
 * service_role` names every grantee we manage), so replaying them lands on the
 * declared state from any starting point. Relations, columns, and schemas
 * declare only positive grants, so they have to start from empty for the replay
 * to mean anything.
 *
 * WHAT MAKES THE "EMPTY" ASSUMPTION SAFE
 *
 * It is asserted, not assumed. After the replay the transaction creates a
 * throwaway table in each managed schema and checks that it arrived with no
 * privileges for any Data API grantee. If a future default privilege makes that
 * false, the script aborts and says so rather than emitting a wrong answer.
 *
 * SCOPE
 *
 * - Managed for relations, columns, and functions: `public` plus every schema
 *   the schema files create.
 * - Managed for schema ACLs: only the schemas the schema files create. The
 *   `public` schema's own ACL is Supabase's, not ours, so it is left alone.
 * - Managed for default privileges: only schemas named by an
 *   `alter default privileges` declaration.
 *
 * Anything undeclared is unmanaged, which is why the run also FAILS on a
 * function that no schema file revokes. A function is the one object class
 * Postgres will not let you deny by default: it grants EXECUTE to `PUBLIC` on
 * creation and `alter default privileges` cannot suppress it, so a function
 * nobody revoked is a function `anon` can call, so the check exits 1 in gate
 * mode. Do not soften it back to a warning: a warning nothing reads lets a
 * `security definer` helper that returns another tenant's member ids sit in
 * the `anon` surface with `test:db` green over it.
 *
 * USAGE
 *
 *   pnpm db:validate-privileges                 # gate; exit 1 on drift
 *   pnpm db:validate-privileges --sql           # print only the SQL it wants
 *   pnpm db:validate-privileges --db-url <url>  # gate another environment
 *
 * `--append` writes the SQL into a migration, and it refuses to run outside
 * `pnpm db:new-migration`. On its own it would skip the no-op view strip that
 * has to come first and the re-verification that has to come after, leaving a
 * migration that looks finished and is not.
 *
 * The gate has to run against a database built from `supabase/migrations/`
 * alone, because the question it answers is "does applying our migrations
 * reproduce our declared ACL?". `pnpm test:db` runs it right after
 * `supabase test db`, which is exactly that.
 */

import {
  getLocalDatabaseConfigFromRepoRoot,
  makeSqlRunner,
} from "../lib/PsqlUtils/PsqlUtils";
import { PrivilegeReconciliation } from "./PrivilegeReconciliation/PrivilegeReconciliation";
import { PrivilegeSql } from "./PrivilegeSql/PrivilegeSql";
import { SupabaseFiles } from "./SupabaseFiles/SupabaseFiles";
import type {
  AclEntry,
  Declarations,
} from "./PrivilegeReconciliation/PrivilegeReconciliation";
import type { Scope } from "./PrivilegeSql/PrivilegeSql";

function _getScopeFromDeclarations(
  declarations: Readonly<Declarations>,
): Scope {
  return {
    relationSchemas: ["public", ...declarations.createdSchemas],
    schemaAclSchemas: declarations.createdSchemas,
    defaultAclSchemas: declarations.defaultAclSchemas,
  };
}

function _getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const withStderr = error as Error & { stderr?: Buffer | string };
    const stderr =
      withStderr.stderr === undefined ? "" : String(withStderr.stderr).trim();
    return stderr === "" ? error.message : stderr;
  }
  return String(error);
}

function _getDeclaredSnapshot(
  options: Readonly<{
    runSql: (sql: string) => string;
    scope: Scope;
    declarations: Readonly<Declarations>;
  }>,
): AclEntry[] {
  const { runSql, scope, declarations } = options;
  return PrivilegeSql.parseSnapshot(
    runSql(PrivilegeSql.getReplaySql({ scope, declarations })),
  );
}

type CliOptions = {
  isAppend: boolean;
  isSqlOnly: boolean;
  isDebugSql: boolean;
  databaseUrl: string | undefined;
  explicitFile: string | undefined;
};

function _getCliOptions(argv: readonly string[]): CliOptions {
  return {
    isAppend: argv.includes("--append"),
    isSqlOnly: argv.includes("--sql"),
    isDebugSql: argv.includes("--debug-sql"),
    databaseUrl: (() => {
      const flag = argv.findIndex((arg) => {
        return arg === "--db-url";
      });
      return flag === -1 ? undefined : argv[flag + 1];
    })(),
    explicitFile: argv.find((arg, index) => {
      return !arg.startsWith("--") && argv[index - 1] !== "--db-url";
    }),
  };
}

type ReportUndeclaredFunctionsOptions = Readonly<{
  runSql: (sql: string) => string;
  scope: Scope;
  declarations: Readonly<Declarations>;
  /** Selects the wording only. The caller decides the exit code. */
  isBlocking: boolean;
}>;

/**
 * Reports every function in scope that no schema file revokes, and returns how
 * many there are. A non-zero count is a gate failure: `PUBLIC` keeps the
 * EXECUTE Postgres grants on creation, so `anon` can call each one.
 *
 * Callers pass `isBlocking: false` under `--append`, because appending cannot
 * close the gap: a function with no declaration produces no statement to
 * append, and `pnpm db:new-migration` ends with a gate run that stops the
 * developer there.
 */
function _reportUndeclaredFunctions(
  options: ReportUndeclaredFunctionsOptions,
): number {
  const { runSql, scope, declarations, isBlocking } = options;
  const undeclared = runSql(
    PrivilegeSql.getUndeclaredFunctionsSql({
      scope,
      declaredSignatures: declarations.revokedFunctionSignatures,
    }),
  )
    .split("\n")
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line !== "";
    });
  if (undeclared.length > 0) {
    const label = isBlocking ? "UNDECLARED FUNCTIONS" : "WARNING";
    console.log(
      `\n${label}: ${undeclared.length} function(s) are not revoked by any schema file, so PUBLIC keeps the EXECUTE that Postgres grants on creation, which means \`anon\` can call them:`,
    );
    undeclared.forEach((signature) => {
      console.log(`  ${signature}`);
    });
    console.log(
      "\nGive each one an explicit `revoke execute on function ... from public, anon, authenticated, service_role;` in its schema file, followed by a `grant` for every role that genuinely needs it. Roles that need it are: any role named by a policy that calls the function (a policy expression is evaluated as the calling role), any role that calls it as an rpc, and any role that runs a statement whose SECURITY INVOKER trigger calls it. A trigger function itself needs no grant.",
    );
  }
  return undeclared.length;
}

/**
 * Refuses `--append` outside `pnpm db:new-migration`, which is the only place
 * it is a correct step. Exits 1 rather than returning, so no caller can carry
 * on with a half-finished migration.
 */
function _assertAppendRunsInsidePipeline(isAppend: boolean): void {
  if (isAppend && process.env.AVANDAR_MIGRATION_PIPELINE !== "1") {
    console.error(
      "--append is a step inside `pnpm db:new-migration`, not a command to run on its own: alone it skips the no-op view strip that must precede it and the re-verification that must follow, so it leaves a migration that looks finished and is not. Run `pnpm db:new-migration <name>`.",
    );
    process.exit(1);
  }
}

/**
 * Runs one snapshot read and exits 1 with `whatFailed` in the message if it
 * throws. Both snapshots need identical failure handling and neither has a
 * useful fallback, so a caught error is the end of the run.
 */
function _readSnapshotOrExit(
  options: Readonly<{ whatFailed: string; read: () => AclEntry[] }>,
): AclEntry[] {
  const { whatFailed, read } = options;
  try {
    return read();
  } catch (error) {
    console.error(`Could not ${whatFailed}: ${_getErrorMessage(error)}`);
    process.exit(1);
  }
}

type FinishOptions = Readonly<{
  isAppend: boolean;
  repoRoot: string;
  explicitFile: string | undefined;
  runSql: (sql: string) => string;
  scope: Scope;
  declarations: Readonly<Declarations>;
  statements: readonly string[];
}>;

/**
 * Ends a run whose privileges already match the declarations. Exits 1 when a
 * function is still undeclared, which is the gate's only remaining failure.
 */
function _finishWithoutDrift(options: FinishOptions): void {
  const { isAppend, runSql, scope, declarations } = options;
  console.log(
    "The database's privileges match supabase/schemas/ exactly. Nothing to do.",
  );
  const undeclared = _reportUndeclaredFunctions({
    runSql,
    scope,
    declarations,
    isBlocking: !isAppend,
  });
  if (undeclared > 0 && !isAppend) {
    process.exit(1);
  }
}

/**
 * Ends a run that owes statements: prints them, then either appends them to
 * the newest migration under `--append` or exits 1 as a gate failure.
 */
function _finishWithDrift(options: FinishOptions): void {
  const {
    isAppend,
    repoRoot,
    explicitFile,
    runSql,
    scope,
    declarations,
    statements,
  } = options;
  console.log("\nStatements needed to match supabase/schemas/:\n");
  statements.forEach((statement) => {
    console.log(`  ${statement}`);
  });
  const undeclared = _reportUndeclaredFunctions({
    runSql,
    scope,
    declarations,
    isBlocking: !isAppend,
  });

  if (!isAppend) {
    console.log(
      "\nDRIFT: the migrations do not reproduce the declared privileges. Run `pnpm db:new-migration <name>` to generate a migration that includes the statements above.",
    );
    process.exit(1);
  }

  SupabaseFiles.appendStatementsToMigration({
    migrationFile:
      explicitFile ?? SupabaseFiles.getNewestMigrationPath(repoRoot),
    statements,
  });
  if (undeclared > 0) {
    console.log(
      "The append is complete, but the functions listed above still have no declaration. The verification step that follows will fail until they do.",
    );
  }
}

/**
 * Everything a run needs before it can compare anything: where the repo is,
 * how to reach the database, and what `supabase/schemas/` declares.
 */
function _getRunContext(databaseUrl: string | undefined): {
  repoRoot: string;
  runSql: (sql: string) => string;
  declarations: Declarations;
  scope: Scope;
} {
  const repoRoot = process.cwd();
  const runSql = makeSqlRunner({
    ...getLocalDatabaseConfigFromRepoRoot(repoRoot),
    databaseUrl,
  });
  const declarations = PrivilegeReconciliation.getDeclarationsFromSchemaFiles(
    SupabaseFiles.getOrderedSchemaFiles(repoRoot).map(SupabaseFiles.readFile),
  );
  return {
    repoRoot,
    runSql,
    declarations,
    scope: _getScopeFromDeclarations(declarations),
  };
}

function main(): void {
  const { isAppend, isSqlOnly, isDebugSql, databaseUrl, explicitFile } =
    _getCliOptions(process.argv.slice(2));
  _assertAppendRunsInsidePipeline(isAppend);

  const { repoRoot, runSql, declarations, scope } = _getRunContext(databaseUrl);

  if (isDebugSql) {
    console.log(PrivilegeSql.getReplaySql({ scope, declarations }));
    return;
  }

  const actual = _readSnapshotOrExit({
    whatFailed: "read privileges from the local database",
    read: () => {
      return PrivilegeSql.parseSnapshot(
        runSql(PrivilegeSql.getSnapshotSql(scope)),
      );
    },
  });
  const declared = _readSnapshotOrExit({
    whatFailed: "replay the declarations from supabase/schemas/",
    read: () => {
      return _getDeclaredSnapshot({ runSql, scope, declarations });
    },
  });

  const { surplus, missing, statements } = PrivilegeReconciliation.reconcile({
    actual,
    declared,
  });

  if (isSqlOnly) {
    console.log(statements.join("\n"));
    process.exit(statements.length === 0 ? 0 : 1);
  }

  console.log(
    `Declared privileges: ${declared.length} · in database: ${actual.length} · ` +
      `surplus: ${surplus.length} · missing: ${missing.length}`,
  );

  const finishOptions = {
    isAppend,
    repoRoot,
    explicitFile,
    runSql,
    scope,
    declarations,
    statements,
  };
  if (statements.length === 0) {
    _finishWithoutDrift(finishOptions);
    return;
  }
  _finishWithDrift(finishOptions);
}

main();
