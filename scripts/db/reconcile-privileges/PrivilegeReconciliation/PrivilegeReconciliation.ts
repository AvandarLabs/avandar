/**
 * Pure decision logic for privilege reconciliation.
 *
 * This module answers two questions and touches no database:
 *
 * 1. Which statements in `supabase/schemas/` are privilege declarations, and
 *    which schemas do they govern?
 * 2. Given the privileges a database actually has and the privileges the
 *    declarations produce, what is the exact SQL that closes the gap?
 *
 * The database work (snapshotting, the throwaway replay, applying nothing)
 * lives
 * in `reconcile-privileges.main.ts`.
 */

import { splitSqlStatements } from "../../lib/splitSqlStatements";

/** The four grantees that make up the Data API surface. */
export const DATA_API_GRANTEES = [
  "PUBLIC",
  "anon",
  "authenticated",
  "service_role",
] as const;

/**
 * The object classes a privilege can sit on. `default` is not an object: it is
 * a row in `pg_default_acl`, keyed by schema and object class.
 */
export type AclKind = "relation" | "column" | "function" | "schema" | "default";

/**
 * One privilege held by one grantee on one object. This is the unit both sides
 * of the comparison are reduced to, so a diff is plain set arithmetic.
 */
export type AclEntry = {
  kind: AclKind;
  /**
   * Already-quoted, directly usable in a `grant`/`revoke`: `"public"."maps"`,
   * `"public"."fn"(uuid)`, `"analytics"`, or `"public"|r` for a default.
   */
  object: string;
  /** Quoted column name, or `""` for everything that is not a column ACL. */
  column: string;
  grantee: string;
  /** Postgres privilege name, e.g. `SELECT`, `EXECUTE`, `TRUNCATE`. */
  privilege: string;
  isGrantable: boolean;
};

/** What the schema directory declares about privileges. */
export type Declarations = {
  /** Privilege statements, in the order the schema files apply them. */
  statements: readonly string[];
  /** Schemas created by the schema files, e.g. `private`, `analytics`. */
  createdSchemas: readonly string[];
  /** Schemas named by an `alter default privileges` declaration. */
  defaultAclSchemas: readonly string[];
  /** Function signatures named by a `revoke ... on function` declaration. */
  revokedFunctionSignatures: readonly string[];
};

const PRIVILEGE_STATEMENT = /^(?:grant|revoke|alter\s+default\s+privileges)\b/i;
const CREATE_SCHEMA =
  /^create\s+schema\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_$]*)/i;
const DEFAULT_ACL_SCHEMA =
  /^alter\s+default\s+privileges\s+for\s+role\s+[a-z_][a-z0-9_$]*\s+in\s+schema\s+([a-z_][a-z0-9_$]*)/i;
const FUNCTION_REVOKE =
  /^revoke\s+(?:all\s+privileges|all|execute)\s+on\s+function\s+([\s\S]+?)\s+from\b/i;

/**
 * Collapses the multi-line formatting the SQL formatter gives a long argument
 * list onto one line, so the signature can be handed to `to_regprocedure`.
 *
 * The signature is never compared as text. Postgres resolves it to an OID,
 * which is the only way `public.resource_type` and `resource_type`, or
 * `(uuid,text)` and `( uuid, text )`, reliably compare equal.
 */
function _toOneLine(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

/**
 * Collects every privilege declaration from already-ordered schema file
 * contents.
 *
 * The caller passes files in the same lexicographic order the Supabase CLI
 * applies them, because a declaration's meaning depends on what ran before it:
 * `00.default_privileges.sql` has to precede the files whose relations it keeps
 * private.
 */
function getDeclarationsFromSchemaFiles(
  orderedFileContents: readonly string[],
): Declarations {
  const statements: string[] = [];
  const createdSchemas: string[] = [];
  const defaultAclSchemas: string[] = [];
  const revokedFunctionSignatures: string[] = [];

  orderedFileContents.forEach((contents) => {
    splitSqlStatements(contents).forEach(({ body }) => {
      const createSchema = CREATE_SCHEMA.exec(body);
      if (createSchema?.[1] !== undefined) {
        createdSchemas.push(createSchema[1]);
        return;
      }
      if (!PRIVILEGE_STATEMENT.test(body)) {
        return;
      }
      statements.push(body);

      const defaultAcl = DEFAULT_ACL_SCHEMA.exec(body);
      if (defaultAcl?.[1] !== undefined) {
        defaultAclSchemas.push(defaultAcl[1]);
      }
      const functionRevoke = FUNCTION_REVOKE.exec(body);
      if (functionRevoke?.[1] !== undefined) {
        revokedFunctionSignatures.push(_toOneLine(functionRevoke[1]));
      }
    });
  });

  return {
    statements,
    createdSchemas: [...new Set(createdSchemas)],
    defaultAclSchemas: [...new Set(defaultAclSchemas)],
    revokedFunctionSignatures: [...new Set(revokedFunctionSignatures)],
  };
}

/**
 * Delimiter for the composite keys below.
 *
 * Deliberately not a space. The fields are joined at fixed arity, so a space
 * happens to be safe for the identifier shapes we produce, but proving that
 * requires reasoning about whether a quoted name's spaces could shift a field
 * boundary. The ASCII unit separator cannot appear in an identifier at all, so
 * the key is unambiguous by construction and nobody has to redo that reasoning.
 *
 * Written as an escape, never as a literal byte. This began life as a literal
 * NUL, which made git classify the whole file as binary and silently stop
 * showing diffs for it.
 */
const KEY_DELIMITER = "\u001f";

function _getAclEntryKey(entry: Readonly<AclEntry>): string {
  return [
    entry.kind,
    entry.object,
    entry.column,
    entry.grantee,
    entry.privilege,
    entry.isGrantable ? "grantable" : "plain",
  ].join(KEY_DELIMITER);
}

/** Everything a `revoke all privileges` has to name to be absolute. */
const ALL_GRANTEES = "public, anon, authenticated, service_role";

type ObjectKey = { kind: AclKind; object: string; column: string };

function _getObjectKeyString(key: Readonly<ObjectKey>): string {
  return [key.kind, key.object, key.column].join(KEY_DELIMITER);
}

function _getDefaultAclParts(object: string): {
  schema: string;
  objectClass: string;
} {
  const [schema = "", objectType = ""] = object.split("|");
  const objectClass =
    objectType === "r"
      ? "tables"
      : objectType === "S"
        ? "sequences"
        : objectType === "f"
          ? "functions"
          : objectType === "T"
            ? "types"
            : "";
  return { schema, objectClass };
}

/**
 * `revoke all privileges ... from every Data API grantee` for one object.
 *
 * Migrations state privileges ABSOLUTELY, not as a delta against the database
 * the migration was generated on. `pg_default_acl` is a case in point:
 * Supabase's
 * shipped default has changed over time, so one project's new tables arrive
 * with
 * all seven privileges and another's with only TRUNCATE, REFERENCES, and
 * TRIGGER. A migration that revoked just the locally surplus bits would leave
 * the other project still granting the rest.
 *
 * `supabase/schemas/` is the opposite case and states privileges positively,
 * because a relation there is created inside the same run and is born private.
 * That asymmetry is the whole difference between a declaration and a repair.
 */
function _getAbsoluteRevoke(key: Readonly<ObjectKey>): string | undefined {
  switch (key.kind) {
    case "relation":
      return `revoke all privileges on table ${key.object} from ${ALL_GRANTEES};`;
    case "column":
      return `revoke all privileges (${key.column}) on table ${key.object} from ${ALL_GRANTEES};`;
    case "function":
      return `revoke all privileges on function ${key.object} from ${ALL_GRANTEES};`;
    case "schema":
      return `revoke all privileges on schema ${key.object} from ${ALL_GRANTEES};`;
    case "default": {
      const { schema, objectClass } = _getDefaultAclParts(key.object);
      if (schema === "" || objectClass === "") {
        return undefined;
      }
      return (
        `alter default privileges for role postgres in schema ${schema} ` +
        `revoke all privileges on ${objectClass} from ${ALL_GRANTEES};`
      );
    }
    default:
      return undefined;
  }
}

/** `PUBLIC` is a keyword in a grant; a role name has to be quoted. */
function _formatGrantee(grantee: string): string {
  return grantee === "PUBLIC" ? "public" : `"${grantee}"`;
}

function _getGrant(
  options: Readonly<{
    key: Readonly<ObjectKey>;
    grantee: string;
    privileges: readonly string[];
  }>,
): string | undefined {
  const { key, grantee, privileges } = options;
  const list = [...privileges].sort().join(", ");
  const to = `to ${_formatGrantee(grantee)}`;
  switch (key.kind) {
    case "relation":
      return `grant ${list} on table ${key.object} ${to};`;
    case "column":
      return `grant ${list} (${key.column}) on table ${key.object} ${to};`;
    case "function":
      return `grant ${list} on function ${key.object} ${to};`;
    case "schema":
      return `grant ${list} on schema ${key.object} ${to};`;
    case "default": {
      const { schema, objectClass } = _getDefaultAclParts(key.object);
      if (schema === "" || objectClass === "") {
        return undefined;
      }
      return (
        `alter default privileges for role postgres in schema ${schema} ` +
        `grant ${list} on ${objectClass} ${to};`
      );
    }
    default:
      return undefined;
  }
}

/**
 * Objects are emitted grouped by class so a schema grant lands before the
 * relations inside it, and defaults last because they only describe objects
 * that
 * do not exist yet.
 */
const KIND_ORDER: readonly AclKind[] = [
  "schema",
  "relation",
  "column",
  "function",
  "default",
];

function _getStatementsForObject(
  options: Readonly<{
    key: Readonly<ObjectKey>;
    declaredForObject: ReadonlyArray<Readonly<AclEntry>>;
  }>,
): string[] {
  const { key, declaredForObject } = options;
  const revoke = _getAbsoluteRevoke(key);
  if (revoke === undefined) {
    return [];
  }

  const byGrantee = new Map<string, string[]>();
  declaredForObject.forEach((entry) => {
    const existing = byGrantee.get(entry.grantee);
    if (existing === undefined) {
      byGrantee.set(entry.grantee, [entry.privilege]);
      return;
    }
    existing.push(entry.privilege);
  });

  return [
    revoke,
    ...[...byGrantee.keys()]
      .sort()
      .map((grantee) => {
        return _getGrant({
          key,
          grantee,
          privileges: byGrantee.get(grantee) ?? [],
        });
      })
      .filter((statement): statement is string => {
        return statement !== undefined;
      }),
  ];
}

export type Reconciliation = {
  /** Privileges the database has but the declarations do not grant. */
  surplus: ReadonlyArray<Readonly<AclEntry>>;
  /** Privileges the declarations grant but the database does not have. */
  missing: ReadonlyArray<Readonly<AclEntry>>;
  /** Exact SQL that turns the actual state into the declared state. */
  statements: readonly string[];
};

/**
 * Compares the privileges a database actually has against the privileges the
 * schema declarations produce, and returns the SQL that closes the gap.
 *
 * `isGrantable` is part of the identity of an entry, not a detail: a grant
 * carrying `with grant option` lets its holder widen access further, so it is a
 * different privilege from the same grant without it.
 */
function reconcile(
  options: Readonly<{
    actual: ReadonlyArray<Readonly<AclEntry>>;
    declared: ReadonlyArray<Readonly<AclEntry>>;
  }>,
): Reconciliation {
  const { actual, declared } = options;
  const declaredKeys = new Set(declared.map(_getAclEntryKey));
  const actualKeys = new Set(actual.map(_getAclEntryKey));

  const surplus = actual.filter((entry) => {
    return !declaredKeys.has(_getAclEntryKey(entry));
  });
  const missing = declared.filter((entry) => {
    return !actualKeys.has(_getAclEntryKey(entry));
  });

  const affected = new Map<string, ObjectKey>();
  [...surplus, ...missing].forEach((entry) => {
    const key = {
      kind: entry.kind,
      object: entry.object,
      column: entry.column,
    };
    affected.set(_getObjectKeyString(key), key);
  });

  const statements = KIND_ORDER.flatMap((kind) => {
    return [...affected.values()]
      .filter((key) => {
        return key.kind === kind;
      })
      .sort((a, b) => {
        return _getObjectKeyString(a).localeCompare(_getObjectKeyString(b));
      })
      .flatMap((key) => {
        return _getStatementsForObject({
          key,
          declaredForObject: declared.filter((entry) => {
            return (
              _getObjectKeyString({
                kind: entry.kind,
                object: entry.object,
                column: entry.column,
              }) === _getObjectKeyString(key)
            );
          }),
        });
      });
  });

  return { surplus, missing, statements };
}

export const PrivilegeReconciliation = {
  getDeclarationsFromSchemaFiles,
  reconcile,
} as const;
