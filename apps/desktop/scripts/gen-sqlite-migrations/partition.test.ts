import { describe, expect, it } from "vitest";
import { extractStatements } from "./parse";
import { partitionStatements } from "./partition";

const syncable = ["datasets", "dashboards", "workspaces"];
const excluded = ["audit_log", "workspace_invites"];

describe("partitionStatements", () => {
  it("skips statements classified as drop (RLS, GRANT, etc.)", () => {
    const stmts = extractStatements(`
      grant select on table "public"."datasets" to "anon";
      alter table "public"."datasets" enable row level security;
      create policy "p" on "public"."datasets" as permissive for select to authenticated using (true);
    `);
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.skipped.length).toBe(3);
    expect(result.included.length).toBe(0);
    expect(result.unknown.length).toBe(0);
  });

  it("includes schema-shape statements on a syncable table with no foreign keys", () => {
    const stmts = extractStatements(
      'create table "public"."datasets" (id text primary key);',
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.included.length).toBe(1);
  });

  it("routes ALTER TABLE ADD CONSTRAINT FOREIGN KEY to needsHandEdit even when FK targets are local", () => {
    // SQLite cannot ADD FKs via ALTER TABLE; they must be inlined into
    // CREATE TABLE. Surface for a human edit rather than silently
    // including a statement SQLite would reject.
    const stmts = extractStatements(
      "alter table dashboards add constraint fk foreign key (workspace_id) references workspaces(id);",
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.needsHandEdit.length).toBe(1);
    expect(result.included.length).toBe(0);
  });

  it("includes inline FK references inside CREATE TABLE (SQLite accepts these as-is)", () => {
    const stmts = extractStatements(
      "create table dashboards (id text primary key, workspace_id text references workspaces(id));",
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.included.length).toBe(1);
    expect(result.needsHandEdit.length).toBe(0);
  });

  it("routes cross-schema foreign keys to droppedForeignKeys", () => {
    const stmts = extractStatements(
      "alter table dashboards add constraint fk foreign key (owner_id) references auth.users(id);",
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.droppedForeignKeys.length).toBe(1);
    expect(result.included.length).toBe(0);
    expect(result.skipped.length).toBe(0);
    expect(result.needsHandEdit.length).toBe(0);
  });

  it("routes excluded-table foreign keys to droppedForeignKeys", () => {
    const stmts = extractStatements(
      "alter table dashboards add constraint fk foreign key (audit_id) references audit_log(id);",
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.droppedForeignKeys.length).toBe(1);
    expect(result.included.length).toBe(0);
    expect(result.skipped.length).toBe(0);
  });

  it("skips schema-shape statements whose primary table is excluded", () => {
    const stmts = extractStatements(
      'create table "public"."audit_log" (id text primary key);',
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.skipped.length).toBe(1);
  });

  it("flags schema-shape statements on an uncategorised table as unknown", () => {
    const stmts = extractStatements(
      'create table "public"."mystery" (id text primary key);',
    );
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.unknown.length).toBe(1);
    expect(result.unknown[0]!.primaryTable).toBe("mystery");
  });

  it("flags statements with an unrecognised leading keyword as unknown", () => {
    const stmts = extractStatements("reindex table public.datasets;");
    const result = partitionStatements({
      statements: stmts,
      syncable,
      excluded,
    });
    expect(result.unknown.length).toBe(1);
    expect(result.unknown[0]!.kind).toBe("unknown");
  });
});
