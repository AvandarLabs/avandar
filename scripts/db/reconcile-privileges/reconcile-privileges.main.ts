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
 * Anything undeclared is unmanaged, which is why the run also reports functions
 * that no schema file revokes. A function is the one object class Postgres will
 * not let you deny by default: it grants EXECUTE to `PUBLIC` on creation and
 * `alter default privileges` cannot suppress it, so a function nobody revoked
 * is
 * a function `anon` can call.
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

import { appendFileSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  getLocalDatabaseConfigFromRepoRoot,
  makeSqlRunner,
} from "../lib/PsqlUtils/PsqlUtils";
import { PrivilegeReconciliation } from "./PrivilegeReconciliation/PrivilegeReconciliation";
import type {
  AclEntry,
  AclKind,
  Declarations,
} from "./PrivilegeReconciliation/PrivilegeReconciliation";

// ASCII unit separator. Object names can contain dots, quotes, and
// parentheses, so the delimiter has to be something an identifier cannot hold.
const FIELD_SEPARATOR = "\u001f";
const PROBE_TABLE_PREFIX = "__acl_probe_";

function _quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

/** `values ('a'),('b')`, or a form that yields no rows for an empty list. */
function _toValuesList(names: readonly string[]): string {
  if (names.length === 0) {
    return "select null::text where false";
  }
  return `values ${names
    .map((name) => {
      return `(${_quoteSqlLiteral(name)})`;
    })
    .join(",")}`;
}

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

type Scope = Readonly<{
  /** Schemas whose relations, columns, and functions we declare. */
  relationSchemas: readonly string[];
  /** Schemas whose own ACL we declare (the ones the schema files create). */
  schemaAclSchemas: readonly string[];
  /** Schemas whose default privileges we declare. */
  defaultAclSchemas: readonly string[];
}>;

function _getScopeFromDeclarations(
  declarations: Readonly<Declarations>,
): Scope {
  return {
    relationSchemas: ["public", ...declarations.createdSchemas],
    schemaAclSchemas: declarations.createdSchemas,
    defaultAclSchemas: declarations.defaultAclSchemas,
  };
}

/**
 * Reads every managed ACL out of the catalogs as one row per
 * (object, column, grantee, privilege).
 *
 * A NULL `proacl` is expanded through `acldefault`, because for a function NULL
 * does not mean "no privileges": it means Postgres's built-in EXECUTE to
 * `PUBLIC` applies. Leaving it NULL would hide the single most important
 * exposure this script exists to catch. A NULL `relacl`, `attacl`, or `nspacl`
 * genuinely does mean owner-only, so those stay unexpanded.
 */
function _getSnapshotSql(scope: Scope): string {
  const grantee = `case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end`;
  return `
with rel_schemas (nspname) as (${_toValuesList(scope.relationSchemas)}),
acl_schemas (nspname) as (${_toValuesList(scope.schemaAclSchemas)}),
def_schemas (nspname) as (${_toValuesList(scope.defaultAclSchemas)}),
entries as (
  select 'relation'::text as kind,
         format('%I.%I', n.nspname, c.relname) as object,
         ''::text as col,
         ${grantee} as grantee,
         a.privilege_type::text as privilege,
         a.is_grantable as is_grantable
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join rel_schemas rs on rs.nspname = n.nspname
   cross join lateral aclexplode(c.relacl) a
   where c.relkind in ('r', 'p', 'v', 'm', 'S')
     and strpos(c.relname, '${PROBE_TABLE_PREFIX}') <> 1
  union all
  select 'column',
         format('%I.%I', n.nspname, c.relname),
         format('%I', att.attname),
         ${grantee},
         a.privilege_type::text,
         a.is_grantable
    from pg_attribute att
    join pg_class c on c.oid = att.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join rel_schemas rs on rs.nspname = n.nspname
   cross join lateral aclexplode(att.attacl) a
   where att.attnum > 0 and not att.attisdropped
     and strpos(c.relname, '${PROBE_TABLE_PREFIX}') <> 1
  union all
  select 'function',
         format('%I.%I(%s)', n.nspname, p.proname,
                pg_get_function_identity_arguments(p.oid)),
         '',
         ${grantee},
         a.privilege_type::text,
         a.is_grantable
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join rel_schemas rs on rs.nspname = n.nspname
   cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  union all
  select 'schema', format('%I', n.nspname), '',
         ${grantee}, a.privilege_type::text, a.is_grantable
    from pg_namespace n
    join acl_schemas s on s.nspname = n.nspname
   cross join lateral aclexplode(n.nspacl) a
  union all
  select 'default', format('%I|%s', dn.nspname, d.defaclobjtype), '',
         ${grantee}, a.privilege_type::text, a.is_grantable
    from pg_default_acl d
    join pg_namespace dn on dn.oid = d.defaclnamespace
    join def_schemas ds on ds.nspname = dn.nspname
   cross join lateral aclexplode(d.defaclacl) a
   where d.defaclrole = 'postgres'::regrole
)
select concat_ws(chr(31),
                 kind, object, col, grantee, privilege, is_grantable::text)
  from entries
 where grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
 order by 1;
`;
}

function _parseSnapshot(output: string): AclEntry[] {
  return output
    .split("\n")
    .filter((line) => {
      return line.includes(FIELD_SEPARATOR);
    })
    .map((line) => {
      const [
        kind = "",
        object = "",
        column = "",
        grantee = "",
        privilege = "",
        grantable = "",
      ] = line.trim().split(FIELD_SEPARATOR);
      return {
        kind: kind as AclKind,
        object,
        column,
        grantee,
        privilege,
        isGrantable: grantable === "true" || grantable === "t",
      };
    });
}

/**
 * Removes every managed relation, column, and schema privilege, leaving the
 * state a freshly created object has. Functions and default privileges are left
 * alone on purpose; see the file header.
 */
function _getStripSql(scope: Scope): string {
  return `
do $$
declare
  target record;
begin
  for target in
    select format('%I.%I', n.nspname, c.relname) as object,
           case when c.relkind = 'S' then 'sequence' else 'table' end as object_kind
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in (select * from (${_toValuesList(scope.relationSchemas)}) v)
       and c.relkind in ('r', 'p', 'v', 'm', 'S')
  loop
    execute format(
      'revoke all privileges on %s %s from public, anon, authenticated, service_role',
      target.object_kind, target.object);
  end loop;

  for target in
    select format('%I.%I', n.nspname, c.relname) as object,
           att.attname as column_name
      from pg_attribute att
      join pg_class c on c.oid = att.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in (select * from (${_toValuesList(scope.relationSchemas)}) v)
       and att.attnum > 0 and not att.attisdropped and att.attacl is not null
  loop
    execute format(
      'revoke all privileges (%I) on table %s from public, anon, authenticated, service_role',
      target.column_name, target.object);
  end loop;

  for target in
    select n.nspname as schema_name
      from pg_namespace n
     where n.nspname in (select * from (${_toValuesList(scope.schemaAclSchemas)}) v)
  loop
    execute format(
      'revoke all privileges on schema %I from public, anon, authenticated, service_role',
      target.schema_name);
  end loop;
end
$$;
`;
}

/**
 * Fails the transaction unless a freshly created relation in every managed
 * schema arrives with no privileges for any Data API grantee.
 *
 * This is the one assumption the replay rests on. Asserting it means a future
 * default privilege turns this script into a loud failure instead of a
 * confidently wrong answer.
 */
function _getFreshRelationAssertionSql(scope: Scope): string {
  return `
do $$
declare
  target record;
  probe text;
  leaked text;
begin
  for target in
    select n.nspname as schema_name
      from pg_namespace n
     where n.nspname in (select * from (${_toValuesList(scope.relationSchemas)}) v)
  loop
    probe := format('%I.%I', target.schema_name,
                    '${PROBE_TABLE_PREFIX}' || replace(target.schema_name, '"', ''));
    execute format('create table %s (probe_column integer)', probe);
    select string_agg(distinct
             case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end, ', ')
      into leaked
      from pg_class c
     cross join lateral aclexplode(c.relacl) a
     where c.oid = probe::regclass
       and (a.grantee = 0
            or a.grantee::regrole::text in ('anon', 'authenticated', 'service_role'));
    if leaked is not null then
      raise exception
        'A new table in schema % is created with privileges for %. reconcile-privileges assumes new relations start private; supabase/schemas/00.default_privileges.sql no longer guarantees that. Fix the declaration or update this script.',
        target.schema_name, leaked;
    end if;
    execute format('drop table %s', probe);
  end loop;
end
$$;
`;
}

/**
 * Functions in a managed schema that no schema file revokes.
 *
 * The declared signatures are resolved with `to_regprocedure` rather than
 * compared as text. Postgres renders an identity argument list with parameter
 * names (`p_map_id uuid`) while a declaration writes bare types (`uuid`), and
 * it
 * schema-qualifies a type only when `search_path` makes it necessary. Resolving
 * to an OID sidesteps all of that; a signature Postgres cannot resolve becomes
 * NULL and is simply ignored.
 *
 * This matters because a function is the one object class Postgres will not let
 * you deny by default: it grants EXECUTE to `PUBLIC` on creation, and
 * `alter default privileges` cannot suppress that. A function nobody revoked is
 * a function `anon` can call.
 */
function _getUndeclaredFunctionsSql(
  options: Readonly<{ scope: Scope; declaredSignatures: readonly string[] }>,
): string {
  const { scope, declaredSignatures } = options;
  const declared =
    declaredSignatures.length === 0
      ? "select null::oid where false"
      : `select to_regprocedure(sig)::oid as oid_ from (values ${declaredSignatures
          .map((signature) => {
            return `(${_quoteSqlLiteral(signature)})`;
          })
          .join(
            ",",
          )}) as declared (sig) where to_regprocedure(sig) is not null`;
  return `
select format('%I.%I(%s)', n.nspname, p.proname,
              pg_get_function_identity_arguments(p.oid))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in (select * from (${_toValuesList(scope.relationSchemas)}) v)
   and p.oid not in (${declared})
 order by 1;
`;
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

/**
 * The ACL a from-scratch build of `supabase/schemas/` produces, measured by
 * replaying the declarations in a rolled-back transaction.
 */
function _getReplaySql(
  options: Readonly<{ scope: Scope; declarations: Readonly<Declarations> }>,
): string {
  const { scope, declarations } = options;
  return [
    "begin;",
    _getStripSql(scope),
    ...declarations.statements.map((statement) => {
      return `${statement};`;
    }),
    _getFreshRelationAssertionSql(scope),
    _getSnapshotSql(scope),
    "rollback;",
  ].join("\n");
}

function _getDeclaredSnapshot(
  options: Readonly<{
    runSql: (sql: string) => string;
    scope: Scope;
    declarations: Readonly<Declarations>;
  }>,
): AclEntry[] {
  const { runSql, scope, declarations } = options;
  return _parseSnapshot(runSql(_getReplaySql({ scope, declarations })));
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

function _reportUndeclaredFunctions(
  options: Readonly<{
    runSql: (sql: string) => string;
    scope: Scope;
    declarations: Readonly<Declarations>;
  }>,
): number {
  const { runSql, scope, declarations } = options;
  const undeclared = runSql(
    _getUndeclaredFunctionsSql({
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
    console.log(
      `\nWARNING: ${undeclared.length} function(s) are not revoked by any schema file, so PUBLIC keeps the EXECUTE that Postgres grants on creation:`,
    );
    undeclared.forEach((signature) => {
      console.log(`  ${signature}`);
    });
  }
  return undeclared.length;
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

function main(): void {
  const { isAppend, isSqlOnly, isDebugSql, databaseUrl, explicitFile } =
    _getCliOptions(process.argv.slice(2));
  if (isAppend && process.env.AVANDAR_MIGRATION_PIPELINE !== "1") {
    console.error(
      "--append is a step inside `pnpm db:new-migration`, not a command to run on its own: alone it skips the no-op view strip that must precede it and the re-verification that must follow, so it leaves a migration that looks finished and is not. Run `pnpm db:new-migration <name>`.",
    );
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runSql = makeSqlRunner({
    ...getLocalDatabaseConfigFromRepoRoot(repoRoot),
    databaseUrl,
  });

  const declarations = PrivilegeReconciliation.getDeclarationsFromSchemaFiles(
    _getOrderedSchemaFiles(repoRoot).map((file) => {
      return readFileSync(file, "utf8");
    }),
  );
  const scope = _getScopeFromDeclarations(declarations);

  if (isDebugSql) {
    console.log(_getReplaySql({ scope, declarations }));
    return;
  }

  const actual = (() => {
    try {
      return _parseSnapshot(runSql(_getSnapshotSql(scope)));
    } catch (error) {
      console.error(
        `Could not read privileges from the local database: ${_getErrorMessage(error)}`,
      );
      process.exit(1);
    }
  })();

  const declared = (() => {
    try {
      return _getDeclaredSnapshot({ runSql, scope, declarations });
    } catch (error) {
      console.error(
        `Could not replay the declarations from supabase/schemas/: ${_getErrorMessage(error)}`,
      );
      process.exit(1);
    }
  })();

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

  if (statements.length === 0) {
    console.log(
      "The database's privileges match supabase/schemas/ exactly. Nothing to do.",
    );
    _reportUndeclaredFunctions({ runSql, scope, declarations });
    return;
  }

  console.log("\nStatements needed to match supabase/schemas/:\n");
  statements.forEach((statement) => {
    console.log(`  ${statement}`);
  });
  _reportUndeclaredFunctions({ runSql, scope, declarations });

  if (!isAppend) {
    console.log(
      "\nDRIFT: the migrations do not reproduce the declared privileges. Run `pnpm db:new-migration <name>` to generate a migration that includes the statements above.",
    );
    process.exit(1);
  }

  _appendStatementsToMigration({
    migrationFile: explicitFile ?? _getNewestMigrationPath(repoRoot),
    statements,
  });
}

main();
