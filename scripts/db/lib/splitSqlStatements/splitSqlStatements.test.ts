import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splitSqlStatements } from "./splitSqlStatements";

/**
 * The splitter is the single parse both `db` tooling paths depend on: the
 * privilege reconciler reads `supabase/schemas/` through it, and the view
 * stripper edits a generated migration through it. Its failure mode is silent
 * in both, so the cases below are about what it must NOT swallow.
 */

/** Everything after the last statement that is not whitespace or a comment. */
function getTrailingNoise(sql: string): string {
  const statements = splitSqlStatements(sql);
  const end = statements.at(-1)?.end ?? 0;
  return sql
    .slice(end)
    .replace(/--[^\n]*\n?/gu, "")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .trim();
}

describe("splitSqlStatements", () => {
  it("splits ordinary statements on their top-level semicolons", () => {
    const statements = splitSqlStatements(
      "grant select on table public.t to authenticated;\nrevoke insert on table public.t from anon;\n",
    );
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual([
      "grant select on table public.t to authenticated",
      "revoke insert on table public.t from anon",
    ]);
  });

  it("ignores a semicolon inside a dollar-quoted body", () => {
    const statements = splitSqlStatements(
      "create function f () returns void as $$ begin perform 1; end; $$ language plpgsql;\ngrant execute on function f () to authenticated;\n",
    );
    expect(statements).toHaveLength(2);
  });

  it("ignores a semicolon inside a string, a line comment, and a block comment", () => {
    const statements = splitSqlStatements(
      "select 'a;b';\n-- a comment; with a semicolon\n/* another; one */\nselect 2;\n",
    );
    expect(
      statements.map((statement) => {
        return statement.body;
      }),
    ).toEqual(["select 'a;b'", "select 2"]);
  });

  // A quoted identifier is not a string, and this repo writes policy and
  // constraint names as English prose. If an apostrophe in one opened a
  // string, it would run to the next quote or to end of file and every
  // following statement would vanish from the parse with no error anywhere.
  it("treats an apostrophe inside a double-quoted identifier as text", () => {
    const sql =
      'create policy "Owner\'s rows" on public.t for select using (true);\ngrant select on table public.t to authenticated;\n';
    const bodies = splitSqlStatements(sql).map((statement) => {
      return statement.body;
    });
    expect(bodies).toEqual([
      'create policy "Owner\'s rows" on public.t for select using (true)',
      "grant select on table public.t to authenticated",
    ]);
  });

  it("ignores a semicolon and a comment marker inside a quoted identifier", () => {
    const sql =
      'create policy "a;b -- c" on public.t for select using (true);\nselect 1;\n';
    expect(splitSqlStatements(sql)).toHaveLength(2);
  });

  it("handles a doubled quote inside a quoted identifier", () => {
    const sql =
      'create policy "say ""hi""" on public.t for select using (true);\nselect 1;\n';
    expect(splitSqlStatements(sql)).toHaveLength(2);
  });

  it("honours backslash escapes inside an E'' string", () => {
    const sql =
      "select E'it\\'s';\ngrant select on table public.t to authenticated;\n";
    expect(splitSqlStatements(sql)).toHaveLength(2);
  });

  it("does not read a trailing e in an identifier as an escape-string prefix", () => {
    // `role'` here is an identifier ending in `e` followed by a plain string.
    const sql = "select role'admin';\nselect 1;\n";
    expect(splitSqlStatements(sql)).toHaveLength(2);
  });

  it("leaves nothing unparsed in any schema or migration file in the repo", () => {
    const unparsed = ["supabase/schemas", "supabase/migrations"].flatMap(
      (dir) => {
        return readdirSync(dir)
          .filter((name) => {
            return name.endsWith(".sql");
          })
          .filter((name) => {
            return (
              getTrailingNoise(readFileSync(path.join(dir, name), "utf8")) !==
              ""
            );
          })
          .map((name) => {
            return `${dir}/${name}`;
          });
      },
    );
    expect(unparsed).toEqual([]);
  });
});
