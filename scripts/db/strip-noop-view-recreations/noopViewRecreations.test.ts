import { describe, expect, it } from "vitest";
import { NoopViewRecreations } from "./noopViewRecreations";
import type { CreateViewStatement, NoopVerdict } from "./noopViewRecreations";

const {
  splitStatements,
  asCreateView,
  asDropView,
  planRemovals,
  applyRemovals,
} = NoopViewRecreations;

/** Treats every view as a no-op, so pairing rules are tested in isolation. */
const ALWAYS_NOOP = (): NoopVerdict => {
  return { isNoop: true, reason: "test stub" };
};

/** Treats every view as changed, which must keep everything. */
const NEVER_NOOP = (): NoopVerdict => {
  return { isNoop: false, reason: "test stub" };
};

/** No-op for one view only, to prove decisions are per-view. */
function noopOnly(name: string): (create: CreateViewStatement) => NoopVerdict {
  return (create) => {
    return create.view.name === name ?
        { isNoop: true, reason: "test stub" }
      : { isNoop: false, reason: "test stub" };
  };
}

function strip(sql: string, isNoop = ALWAYS_NOOP): string {
  const statements = splitStatements(sql);
  const { removals } = planRemovals({ statements, isNoop });
  return applyRemovals(sql, removals);
}

describe("splitStatements", () => {
  it("splits on top-level semicolons", () => {
    const statements = splitStatements("select 1;\n\nselect 2;\n");
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual(["select 1", "select 2"]);
  });

  it("ignores semicolons inside single-quoted strings", () => {
    const statements = splitStatements("select 'a;b';\nselect 2;");
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual(["select 'a;b'", "select 2"]);
  });

  it("handles doubled quotes as escapes, not string terminators", () => {
    const statements = splitStatements("select 'it''s; fine';\nselect 2;");
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual(["select 'it''s; fine'", "select 2"]);
  });

  // The analytics category function is a `$$`-quoted body full of semicolons.
  // Splitting naively would cut it in half and corrupt the migration.
  it("does not split inside a dollar-quoted body", () => {
    const sql = [
      "create function f() returns int as $$",
      "  select 1; select 2;",
      "$$ language sql;",
      "select 3;",
    ].join("\n");
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]?.body).toContain("select 1; select 2;");
    expect(statements[1]?.body).toBe("select 3");
  });

  it("does not split inside a tagged dollar-quoted body", () => {
    const sql =
      "create function f() as $body$ a; b; $body$ language sql;\nselect 3;";
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
  });

  it("ignores semicolons in line and block comments", () => {
    const sql = "-- a; comment\n/* another; one */\nselect 1;";
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(1);
    expect(statements[0]?.body).toBe("select 1");
  });

  it("excludes a leading comment from the body but keeps it in place", () => {
    const sql = "-- explanatory note\nselect 1;";
    const statements = splitStatements(sql);
    expect(statements[0]?.body).toBe("select 1");
    // contentStart points at `select`, so removal never eats the comment above.
    expect(sql.slice(statements[0]?.contentStart ?? 0)).toBe("select 1;");
  });
});

describe("asCreateView", () => {
  it("reads a quoted, schema-qualified create-or-replace view", () => {
    const statement = splitStatements(
      'create or replace view "analytics"."plan_movement" as select 1;',
    )[0];
    const create = asCreateView(statement!);
    expect(create?.view).toEqual({
      schema: "analytics",
      name: "plan_movement",
    });
    expect(create?.viewBody).toBe("select 1");
  });

  it("reads unquoted identifiers and a bare create view", () => {
    const statement = splitStatements(
      "create view analytics.plan_movement as select 1;",
    )[0];
    const create = asCreateView(statement!);
    expect(create?.view).toEqual({
      schema: "analytics",
      name: "plan_movement",
    });
  });

  it("is not fooled by a create table", () => {
    const statement = splitStatements('create table "public"."t" (id int);')[0];
    expect(asCreateView(statement!)).toBeUndefined();
  });

  it("is not fooled by a materialized view, which this tool does not handle", () => {
    const statement = splitStatements(
      "create materialized view analytics.m as select 1;",
    )[0];
    expect(asCreateView(statement!)).toBeUndefined();
  });
});

describe("asDropView", () => {
  it("reads a drop view if exists", () => {
    const statement = splitStatements(
      'drop view if exists "analytics"."activation";',
    )[0];
    expect(asDropView(statement!)?.view).toEqual({
      schema: "analytics",
      name: "activation",
    });
  });

  it("reads a plain drop view", () => {
    const statement = splitStatements("drop view analytics.activation;")[0];
    expect(asDropView(statement!)?.view).toEqual({
      schema: "analytics",
      name: "activation",
    });
  });

  it("is not fooled by a drop table", () => {
    const statement = splitStatements('drop table "public"."t";')[0];
    expect(asDropView(statement!)).toBeUndefined();
  });
});

describe("planRemovals", () => {
  const PAIR = [
    'drop view if exists "analytics"."a";',
    'create or replace view "analytics"."a" as select 1;',
  ].join("\n\n");

  it("removes a proven no-op pair", () => {
    const statements = splitStatements(PAIR);
    const { removals, decisions } = planRemovals({
      statements,
      isNoop: ALWAYS_NOOP,
    });
    expect(removals).toHaveLength(2);
    expect(decisions).toEqual([
      {
        view: { schema: "analytics", name: "a" },
        isRemoved: true,
        reason: "test stub",
      },
    ]);
  });

  it("keeps everything when the definition differs", () => {
    const statements = splitStatements(PAIR);
    const { removals, decisions } = planRemovals({
      statements,
      isNoop: NEVER_NOOP,
    });
    expect(removals).toHaveLength(0);
    expect(decisions[0]?.isRemoved).toBe(false);
  });

  // The rule that protects a deliberate deletion: a drop whose create is absent
  // is the migration removing a view on purpose.
  it("keeps a drop that has no matching create", () => {
    const statements = splitStatements(
      'drop view if exists "analytics"."gone";',
    );
    const { removals } = planRemovals({ statements, isNoop: ALWAYS_NOOP });
    expect(removals).toHaveLength(0);
  });

  // And the rule that protects a real change when other views are noise.
  it("keeps the drop belonging to a changed view while removing the others", () => {
    const sql = [
      'drop view if exists "analytics"."a";',
      'drop view if exists "analytics"."b";',
      'create or replace view "analytics"."a" as select 1;',
      'create or replace view "analytics"."b" as select 2;',
    ].join("\n\n");
    const statements = splitStatements(sql);
    const { removals } = planRemovals({ statements, isNoop: noopOnly("a") });
    const removedText = removals.map((span) => {
      return sql.slice(span.start, span.end);
    });
    expect(removedText).toEqual([
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
    ]);
  });

  it("ignores non-view statements entirely", () => {
    const statements = splitStatements(
      'create table "public"."t" (id int);\n\nrevoke select on table "public"."t" from "anon";',
    );
    const { removals, decisions } = planRemovals({
      statements,
      isNoop: ALWAYS_NOOP,
    });
    expect(removals).toHaveLength(0);
    expect(decisions).toHaveLength(0);
  });
});

describe("applyRemovals", () => {
  it("returns the input unchanged when nothing is removable", () => {
    const sql = 'create table "public"."t" (id int);\n';
    expect(strip(sql)).toBe(sql);
  });

  it("preserves surrounding statements byte-for-byte", () => {
    const sql = [
      'create table "public"."t" (id int);',
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
      'grant select on table "public"."t" to "authenticated";',
      "",
    ].join("\n\n");
    expect(strip(sql)).toBe(
      [
        'create table "public"."t" (id int);',
        'grant select on table "public"."t" to "authenticated";',
        "",
      ].join("\n\n"),
    );
  });

  it("keeps a preceding comment attached to a surviving statement", () => {
    const sql = [
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
      "-- keep me",
      "select 1;",
      "",
    ].join("\n\n");
    expect(strip(sql)).toBe(["-- keep me", "select 1;", ""].join("\n\n"));
  });

  it("does not corrupt a dollar-quoted function that sits beside a removal", () => {
    const sql = [
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
      "create function f() returns int as $$ select 1; $$ language sql;",
      "",
    ].join("\n\n");
    expect(strip(sql)).toBe(
      [
        "create function f() returns int as $$ select 1; $$ language sql;",
        "",
      ].join("\n\n"),
    );
  });

  it("is idempotent", () => {
    const sql = [
      'create table "public"."t" (id int);',
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
      "",
    ].join("\n\n");
    const once = strip(sql);
    expect(strip(once)).toBe(once);
  });

  it("leaves output that still parses into the expected statements", () => {
    const sql = [
      'create table "public"."t" (id int);',
      'drop view if exists "analytics"."a";',
      'create or replace view "analytics"."a" as select 1;',
      "",
    ].join("\n\n");
    const statements = splitStatements(strip(sql));
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual(['create table "public"."t" (id int)']);
  });
});
