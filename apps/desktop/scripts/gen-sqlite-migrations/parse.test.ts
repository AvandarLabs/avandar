import { describe, expect, it } from "vitest";
import { classifyStatement, extractStatements } from "./parse";

describe("classifyStatement", () => {
  it("classifies CREATE TABLE / ALTER TABLE / DROP TABLE as schema-shape", () => {
    expect(classifyStatement('create table "public"."x" (id text);')).toBe(
      "schema-shape",
    );
    expect(
      classifyStatement('alter table "public"."x" add column y text;'),
    ).toBe("schema-shape");
    expect(classifyStatement('drop table "public"."x";')).toBe("schema-shape");
  });

  it("classifies CREATE [UNIQUE] INDEX and DROP INDEX as schema-shape", () => {
    expect(
      classifyStatement("create index idx on public.x using btree (id);"),
    ).toBe("schema-shape");
    expect(
      classifyStatement(
        "create unique index idx on public.x using btree (id);",
      ),
    ).toBe("schema-shape");
    expect(classifyStatement("drop index public.idx;")).toBe("schema-shape");
  });

  it("classifies ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY as drop", () => {
    expect(
      classifyStatement('alter table "public"."x" enable row level security;'),
    ).toBe("drop");
    expect(
      classifyStatement(
        'alter table "public"."x" disable row level security;',
      ),
    ).toBe("drop");
  });

  it("classifies ALTER TABLE ... VALIDATE CONSTRAINT as drop", () => {
    expect(
      classifyStatement(
        'alter table "public"."x" validate constraint "x_fkey";',
      ),
    ).toBe("drop");
  });

  it("classifies GRANT / REVOKE as drop", () => {
    expect(
      classifyStatement('grant select on table "public"."x" to "anon";'),
    ).toBe("drop");
    expect(
      classifyStatement("revoke select on table public.x from anon;"),
    ).toBe("drop");
  });

  it("classifies CREATE / DROP POLICY as drop", () => {
    expect(
      classifyStatement(
        'create policy "p" on "public"."x" as permissive for select to authenticated using (true);',
      ),
    ).toBe("drop");
    expect(classifyStatement('drop policy "p" on "public"."x";')).toBe("drop");
  });

  it("classifies CREATE OR REPLACE FUNCTION / DROP FUNCTION as drop", () => {
    expect(
      classifyStatement(
        "create or replace function public.f() returns void language plpgsql as $$ begin end; $$;",
      ),
    ).toBe("drop");
    expect(classifyStatement("drop function if exists public.f;")).toBe(
      "drop",
    );
  });

  it("classifies CREATE / DROP TRIGGER as drop", () => {
    expect(
      classifyStatement(
        "create trigger tr before update on public.x for each row execute function f();",
      ),
    ).toBe("drop");
    expect(classifyStatement("drop trigger if exists tr on public.x;")).toBe(
      "drop",
    );
  });

  it("classifies CREATE TYPE (Postgres enums) as drop", () => {
    expect(
      classifyStatement("create type public.mood as enum ('happy', 'sad');"),
    ).toBe("drop");
  });

  it("classifies CREATE EXTENSION / COMMENT / SET as drop", () => {
    expect(
      classifyStatement("create extension if not exists pgcrypto;"),
    ).toBe("drop");
    expect(classifyStatement("comment on table public.x is 'hi';")).toBe(
      "drop",
    );
    expect(classifyStatement("set check_function_bodies = off;")).toBe("drop");
  });

  it("classifies a leading keyword it does not know as unknown", () => {
    expect(classifyStatement("reindex table public.x;")).toBe("unknown");
    expect(classifyStatement("vacuum analyze public.x;")).toBe("unknown");
  });
});

describe("extractStatements", () => {
  it("splits a multi-statement file on the unquoted semicolon", () => {
    const stmts = extractStatements(`
      create table foo (id text primary key);
      create table bar (id text primary key);
    `);
    expect(stmts.length).toBe(2);
    expect(stmts[0]!.sql.toLowerCase()).toContain("create table foo");
    expect(stmts[1]!.sql.toLowerCase()).toContain("create table bar");
  });

  it("populates kind via classifyStatement on every statement", () => {
    const stmts = extractStatements(
      'create table "public"."x" (id text); grant select on table "public"."x" to "anon";',
    );
    expect(stmts[0]!.kind).toBe("schema-shape");
    expect(stmts[1]!.kind).toBe("drop");
  });

  it("identifies the primary table on CREATE TABLE", () => {
    const stmts = extractStatements(
      'create table "public"."datasets" (id text);',
    );
    expect(stmts[0]!.primaryTable).toBe("datasets");
  });

  it("identifies the primary table on ALTER TABLE without a schema qualifier", () => {
    const stmts = extractStatements(
      "alter table dashboards add column color text;",
    );
    expect(stmts[0]!.primaryTable).toBe("dashboards");
  });

  it("identifies the primary table on CREATE INDEX ... ON public.X", () => {
    const stmts = extractStatements(
      "create index idx on public.datasets using btree (workspace_id);",
    );
    expect(stmts[0]!.primaryTable).toBe("datasets");
  });

  it("does not pick up FK targets as the primary table", () => {
    const stmts = extractStatements(
      "alter table entity_configs add constraint fk foreign key (workspace_id) references workspaces(id);",
    );
    expect(stmts[0]!.primaryTable).toBe("entity_configs");
  });

  it("captures FK references with a public schema as unqualified", () => {
    const stmts = extractStatements(
      "alter table entity_configs add constraint fk foreign key (workspace_id) references public.workspaces(id);",
    );
    expect(stmts[0]!.fkReferences).toEqual([
      { schema: undefined, table: "workspaces" },
    ]);
  });

  it("captures FK references to a non-public schema as cross-schema", () => {
    const stmts = extractStatements(
      "alter table entity_configs add constraint fk foreign key (owner_id) references auth.users(id) on update cascade;",
    );
    expect(stmts[0]!.fkReferences).toEqual([
      { schema: "auth", table: "users" },
    ]);
  });

  it("does not treat GRANT REFERENCES ON TABLE as a FK reference", () => {
    const stmts = extractStatements(
      'grant references on table "public"."entity_configs" to "anon";',
    );
    expect(stmts[0]!.fkReferences).toEqual([]);
  });

  it("ignores semicolons inside single-quoted strings", () => {
    const stmts = extractStatements(
      "insert into datasets (id, note) values ('a', 'hi; there');",
    );
    expect(stmts.length).toBe(1);
  });

  it("strips line and block comments before parsing", () => {
    const stmts = extractStatements(`
      -- a line comment
      create table foo (id text); /* block ;comment */
      create table bar (id text);
    `);
    expect(stmts.length).toBe(2);
  });

  it("does not split on semicolons inside dollar-quoted function bodies", () => {
    const stmts = extractStatements(`
      create or replace function public.f()
      returns trigger
      language plpgsql
      as $function$
      begin
        if x then
          return new;
        end if;
        return null;
      end;
      $function$;
      create table after_fn (id text);
    `);
    expect(stmts.length).toBe(2);
    expect(stmts[0]!.sql.toLowerCase()).toContain("create or replace function");
    expect(stmts[1]!.sql.toLowerCase()).toContain("create table after_fn");
  });
});
