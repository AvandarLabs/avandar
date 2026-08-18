import { describe, expect, it } from "vitest";
import { PrivilegeReconciliation } from "./PrivilegeReconciliation";
import type { AclEntry } from "./PrivilegeReconciliation";

const { getDeclarationsFromSchemaFiles, reconcile } = PrivilegeReconciliation;

function _entry(overrides: Partial<AclEntry>): AclEntry {
  return {
    kind: "relation",
    object: `"public"."maps"`,
    column: "",
    grantee: "authenticated",
    privilege: "SELECT",
    isGrantable: false,
    ...overrides,
  };
}

describe("getDeclarationsFromSchemaFiles", () => {
  it("collects grant, revoke, and default privilege statements in file order", () => {
    const declarations = getDeclarationsFromSchemaFiles([
      `alter default privileges for role postgres in schema public
       revoke all privileges on tables from public, anon;`,
      `create table public.maps (id uuid);
       grant select on table public.maps to authenticated;`,
    ]);

    expect(declarations.statements).toHaveLength(2);
    expect(declarations.statements[0]).toContain("alter default privileges");
    expect(declarations.statements[1]).toContain("grant select");
  });

  it("ignores statements that are not privilege declarations", () => {
    const declarations = getDeclarationsFromSchemaFiles([
      `create table public.maps (id uuid);
       alter table public.maps enable row level security;
       create policy "p" on public.maps for select to authenticated using (true);`,
    ]);

    expect(declarations.statements).toEqual([]);
  });

  it("records schemas the files create and schemas with default privileges", () => {
    const declarations = getDeclarationsFromSchemaFiles([
      "create schema if not exists private;",
      "create schema analytics;",
      `alter default privileges for role postgres in schema public
       revoke all privileges on tables from anon;`,
    ]);

    expect(declarations.createdSchemas).toEqual(["private", "analytics"]);
    expect(declarations.defaultAclSchemas).toEqual(["public"]);
  });

  it("records revoked function signatures collapsed onto one line", () => {
    const declarations = getDeclarationsFromSchemaFiles([
      `revoke all on function public.util__thing (
         uuid,
         text
       )
       from
         public,
         anon;`,
      "revoke execute on function private.other () from public;",
    ]);

    expect(declarations.revokedFunctionSignatures).toEqual([
      "public.util__thing ( uuid, text )",
      "private.other ()",
    ]);
  });

  it("does not treat a create schema statement as a privilege statement", () => {
    const declarations = getDeclarationsFromSchemaFiles([
      "create schema if not exists private;",
    ]);

    expect(declarations.statements).toEqual([]);
  });
});

describe("reconcile", () => {
  const ALL = "public, anon, authenticated, service_role";

  it("returns no statements when the two sides match", () => {
    const entries = [_entry({}), _entry({ privilege: "INSERT" })];

    expect(
      reconcile({ actual: entries, declared: entries }).statements,
    ).toEqual([]);
  });

  it("revokes absolutely when the database holds a privilege nothing declares", () => {
    const result = reconcile({
      actual: [_entry({ privilege: "TRUNCATE" })],
      declared: [],
    });

    expect(result.surplus).toHaveLength(1);
    expect(result.statements).toEqual([
      `revoke all privileges on table "public"."maps" from ${ALL};`,
    ]);
  });

  it("revokes everything then re-grants exactly what is declared", () => {
    const result = reconcile({
      actual: [_entry({ privilege: "TRUNCATE" })],
      declared: [
        _entry({ privilege: "SELECT" }),
        _entry({ privilege: "INSERT" }),
      ],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on table "public"."maps" from ${ALL};`,
      `grant INSERT, SELECT on table "public"."maps" to "authenticated";`,
    ]);
  });

  it("re-grants every grantee of a touched object, not only the drifted one", () => {
    const result = reconcile({
      actual: [_entry({ privilege: "TRUNCATE" })],
      declared: [
        _entry({ privilege: "SELECT", grantee: "authenticated" }),
        _entry({ privilege: "SELECT", grantee: "service_role" }),
      ],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on table "public"."maps" from ${ALL};`,
      `grant SELECT on table "public"."maps" to "authenticated";`,
      `grant SELECT on table "public"."maps" to "service_role";`,
    ]);
  });

  it("leaves an object alone when only a different object drifted", () => {
    const drifted = _entry({
      object: `"public"."other"`,
      privilege: "TRUNCATE",
    });
    const stable = _entry({ privilege: "SELECT" });
    const result = reconcile({
      actual: [drifted, stable],
      declared: [stable],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on table "public"."other" from ${ALL};`,
    ]);
  });

  it("writes PUBLIC as a keyword rather than a quoted role", () => {
    const result = reconcile({
      actual: [_entry({ privilege: "TRUNCATE" })],
      declared: [_entry({ grantee: "PUBLIC", privilege: "SELECT" })],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on table "public"."maps" from ${ALL};`,
      `grant SELECT on table "public"."maps" to public;`,
    ]);
  });

  it("treats a grantable privilege as different from the same plain one", () => {
    const result = reconcile({
      actual: [_entry({ isGrantable: true })],
      declared: [_entry({ isGrantable: false })],
    });

    expect(result.surplus).toHaveLength(1);
    expect(result.missing).toHaveLength(1);
  });

  it("formats a column privilege with the column list", () => {
    const key = {
      kind: "column",
      column: `"payload"`,
      object: `"public"."usage_analytics_events"`,
    } as const;
    const result = reconcile({
      actual: [_entry({ ...key, privilege: "SELECT" })],
      declared: [_entry({ ...key, privilege: "INSERT" })],
    });

    expect(result.statements).toEqual([
      `revoke all privileges ("payload") on table "public"."usage_analytics_events" from ${ALL};`,
      `grant INSERT ("payload") on table "public"."usage_analytics_events" to "authenticated";`,
    ]);
  });

  it("formats a schema privilege", () => {
    const result = reconcile({
      actual: [],
      declared: [
        _entry({
          kind: "schema",
          object: `"analytics"`,
          privilege: "USAGE",
          grantee: "service_role",
        }),
      ],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on schema "analytics" from ${ALL};`,
      `grant USAGE on schema "analytics" to "service_role";`,
    ]);
  });

  it("formats a function privilege", () => {
    const result = reconcile({
      actual: [
        _entry({
          kind: "function",
          object: `"public"."f"(uuid)`,
          privilege: "EXECUTE",
          grantee: "PUBLIC",
        }),
      ],
      declared: [],
    });

    expect(result.statements).toEqual([
      `revoke all privileges on function "public"."f"(uuid) from ${ALL};`,
    ]);
  });

  it("turns a default privilege entry back into alter default privileges", () => {
    const result = reconcile({
      actual: [
        _entry({
          kind: "default",
          object: "public|r",
          privilege: "TRUNCATE",
          grantee: "anon",
        }),
      ],
      declared: [],
    });

    expect(result.statements).toEqual([
      `alter default privileges for role postgres in schema public revoke all privileges on tables from ${ALL};`,
    ]);
  });

  it("maps every default privilege object class it knows", () => {
    const classes = [
      ["public|r", "tables"],
      ["public|S", "sequences"],
      ["public|f", "functions"],
      ["public|T", "types"],
    ] as const;

    classes.forEach(([object, objectClass]) => {
      const result = reconcile({
        actual: [
          _entry({
            kind: "default",
            object,
            privilege: "USAGE",
            grantee: "anon",
          }),
        ],
        declared: [],
      });
      expect(result.statements[0]).toContain(`on ${objectClass} from`);
    });
  });

  it("drops a default privilege entry whose object class is unknown", () => {
    const result = reconcile({
      actual: [
        _entry({ kind: "default", object: "public|Z", privilege: "USAGE" }),
      ],
      declared: [],
    });

    expect(result.surplus).toHaveLength(1);
    expect(result.statements).toEqual([]);
  });

  it("emits schema statements before relation statements", () => {
    const result = reconcile({
      actual: [
        _entry({ privilege: "TRUNCATE" }),
        _entry({ kind: "schema", object: `"analytics"`, privilege: "CREATE" }),
      ],
      declared: [],
    });

    expect(result.statements[0]).toContain("on schema");
    expect(result.statements[1]).toContain("on table");
  });
});
