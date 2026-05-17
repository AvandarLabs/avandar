import { describe, expect, it } from "vitest";
import {
  extractStatements,
  partitionStatements,
  type Statement,
} from "./gen-sqlite-migrations";

describe("partitionStatements", () => {
  const syncable = ["datasets", "dashboards"];
  const excluded = ["audit_log", "workspace_invites"];

  it("includes statements that touch only syncable tables", () => {
    const stmts: Statement[] = [
      {
        tables: ["datasets"],
        sql: "create table datasets (id text primary key);",
      },
      {
        tables: ["dashboards"],
        sql: "create index idx_d on dashboards(workspace_id);",
      },
    ];
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.included).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
    expect(result.unknown).toHaveLength(0);
  });

  it("skips statements that touch only excluded tables", () => {
    const stmts: Statement[] = [
      {
        tables: ["audit_log"],
        sql: "create table audit_log (id text primary key);",
      },
    ];
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.included).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.unknown).toHaveLength(0);
  });

  it("flags statements that touch a table not categorised in either list", () => {
    const stmts: Statement[] = [
      {
        tables: ["mystery_new_table"],
        sql: "create table mystery_new_table (id text);",
      },
    ];
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.unknown).toHaveLength(1);
    expect(result.unknown[0]!.tables).toEqual(["mystery_new_table"]);
  });

  it("flags statements that mix syncable and excluded tables as unknown so the engineer makes an explicit call", () => {
    const stmts: Statement[] = [
      {
        tables: ["datasets", "audit_log"],
        sql: "alter table datasets add column audit_log_id text references audit_log(id);",
      },
    ];
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.unknown).toHaveLength(1);
  });

  it("statements that reference no tables (e.g. CREATE EXTENSION) are skipped", () => {
    const stmts: Statement[] = [
      { tables: [], sql: "create extension if not exists pgcrypto;" },
    ];
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.included).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.unknown).toHaveLength(0);
  });
});

describe("extractStatements", () => {
  it("splits a multi-statement file on the unquoted semicolon", () => {
    const sql = `
      create table foo (id text primary key);
      create table bar (id text primary key);
    `;
    const stmts = extractStatements(sql);
    expect(stmts.length).toBe(2);
    expect(stmts[0]!.sql.toLowerCase()).toContain("create table foo");
    expect(stmts[1]!.sql.toLowerCase()).toContain("create table bar");
  });

  it("identifies the primary table from CREATE TABLE", () => {
    const stmts = extractStatements(
      'create table "public"."datasets" (id text primary key);',
    );
    expect(stmts[0]!.tables).toContain("datasets");
  });

  it("identifies the primary table from ALTER TABLE", () => {
    const stmts = extractStatements(
      "alter table public.dashboards add column color text;",
    );
    expect(stmts[0]!.tables).toContain("dashboards");
  });

  it("identifies the table from CREATE INDEX ... ON", () => {
    const stmts = extractStatements(
      "create index idx_workspace on public.datasets (workspace_id);",
    );
    expect(stmts[0]!.tables).toContain("datasets");
  });

  it("captures every distinct table mentioned in a statement", () => {
    const stmts = extractStatements(
      "alter table datasets add column audit_log_id text references audit_log(id);",
    );
    expect(stmts[0]!.tables).toContain("datasets");
    expect(stmts[0]!.tables).toContain("audit_log");
  });

  it("ignores semicolons inside single-quoted strings", () => {
    const sql = "insert into datasets (id, note) values ('a', 'hi; there');";
    const stmts = extractStatements(sql);
    expect(stmts.length).toBe(1);
  });

  it("strips line comments and block comments before parsing", () => {
    const sql = `
      -- this is a line comment
      create table foo (id text primary key); /* block ;comment */
      create table bar (id text primary key);
    `;
    const stmts = extractStatements(sql);
    expect(stmts.length).toBe(2);
  });
});
