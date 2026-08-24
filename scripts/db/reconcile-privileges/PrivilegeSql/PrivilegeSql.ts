import type {
  AclEntry,
  AclKind,
  Declarations,
} from "../PrivilegeReconciliation/PrivilegeReconciliation";

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

export type Scope = Readonly<{
  /** Schemas whose relations, columns, and functions we declare. */
  relationSchemas: readonly string[];
  /** Schemas whose own ACL we declare (the ones the schema files create). */
  schemaAclSchemas: readonly string[];
  /** Schemas whose default privileges we declare. */
  defaultAclSchemas: readonly string[];
}>;

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
    declaredSignatures.length === 0 ?
      "select null::oid where false"
    : `select to_regprocedure(sig)::oid as oid_ from (values ${declaredSignatures
        .map((signature) => {
          return `(${_quoteSqlLiteral(signature)})`;
        })
        .join(",")}) as declared (sig) where to_regprocedure(sig) is not null`;
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

/**
 * Every SQL string the reconciler sends, plus the parser for what comes back.
 *
 * Split out from the entry point because it is the bulk of the tool and none
 * of it touches a database, a file, or the process: each member turns a
 * `Scope` (and sometimes a set of declarations) into text, and `parseSnapshot`
 * turns psql's output back into `AclEntry` rows. That makes the whole surface
 * readable and testable without a connection.
 */
export const PrivilegeSql = {
  /** Quotes a value as a SQL string literal, doubling any embedded quote. */
  quoteSqlLiteral: _quoteSqlLiteral,

  /**
   * Reads every managed ACL out of the catalogs as one row per
   * (object, column, grantee, privilege).
   */
  getSnapshotSql: _getSnapshotSql,

  /** Parses `getSnapshotSql` output back into ACL entries. */
  parseSnapshot: _parseSnapshot,

  /**
   * Removes every managed relation, column, and schema privilege, leaving the
   * state a freshly created object has.
   */
  getStripSql: _getStripSql,

  /**
   * Asserts that a relation created after the replay arrives with no Data API
   * privileges, so the strip above is known to have started from empty.
   */
  getFreshRelationAssertionSql: _getFreshRelationAssertionSql,

  /** Lists functions in scope that no declaration revokes. */
  getUndeclaredFunctionsSql: _getUndeclaredFunctionsSql,

  /**
   * The whole rolled-back replay: strip, apply every declaration, assert, and
   * snapshot. Its output is the ACL a from-scratch schema build produces.
   */
  getReplaySql: _getReplaySql,
};
