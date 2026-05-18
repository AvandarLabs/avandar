import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { bootstrapSnapshotIfNeeded } from "./SnapshotBootstrap.ts";
import { openSqliteDatabase, runMigrations } from "./Sqlite.ts";
import type { SupabaseRestClient } from "./SupabaseRest.ts";

function makeRest(
  responsesByTable: Record<string, ReadonlyArray<Record<string, unknown>>>,
): { rest: SupabaseRestClient; calls: string[] } {
  const calls: string[] = [];
  const rest: SupabaseRestClient = {
    selectAll: mock(async (table: string) => {
      calls.push(table);
      return responsesByTable[table] ?? [];
    }),
  };
  return { rest, calls };
}

describe("bootstrapSnapshotIfNeeded", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ava-snap-test-"));
  });

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("inserts rows from Supabase when the local table is empty", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key, name text);",
      },
    ]);
    const { rest, calls } = makeRest({
      datasets: [
        { id: "a", name: "Alpha" },
        { id: "b", name: "Bravo" },
      ],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });

    const rows = db
      .query<
        { id: string; name: string },
        []
      >("select id, name from datasets order by id")
      .all();
    expect(rows).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
    ]);
    expect(calls).toEqual(["datasets"]);
    db.close();
  });

  it("skips tables that already have rows", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    db.run("insert into datasets (id) values ('existing');");

    const { rest, calls } = makeRest({ datasets: [] });
    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });
    expect(calls).toEqual([]);
    db.close();
  });

  it("skips tables that do not exist in the local schema (deprecated names)", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    const { rest, calls } = makeRest({});
    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets", "datasets__legacy_dropped"],
    });
    expect(calls).toEqual(["datasets"]);
    db.close();
  });

  it("stringifies object-valued columns before insert (jsonb mirror)", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql:
          "create table dashboards (id text primary key, config text not null);",
      },
    ]);
    const { rest } = makeRest({
      dashboards: [
        { id: "d1", config: { layout: "grid", widgets: [1, 2] } },
      ],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["dashboards"],
    });

    const rows = db
      .query<
        { id: string; config: string },
        []
      >("select id, config from dashboards")
      .all();
    expect(rows[0]?.id).toBe("d1");
    expect(JSON.parse(rows[0]!.config)).toEqual({
      layout: "grid",
      widgets: [1, 2],
    });
    db.close();
  });

  it("coerces booleans to 0/1 before insert", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table flags (id text primary key, ok integer not null);",
      },
    ]);
    const { rest } = makeRest({
      flags: [
        { id: "x", ok: true },
        { id: "y", ok: false },
      ],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["flags"],
    });

    const rows = db
      .query<{ id: string; ok: number }, []>("select id, ok from flags order by id")
      .all();
    expect(rows).toEqual([
      { id: "x", ok: 1 },
      { id: "y", ok: 0 },
    ]);
    db.close();
  });

  it("rolls back a table's batch if any single insert fails", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key not null);",
      },
    ]);
    const { rest } = makeRest({
      datasets: [
        { id: "a" },
        { id: null }, // violates primary key not-null
      ],
    });

    await expect(
      bootstrapSnapshotIfNeeded({
        db,
        rest,
        accessToken: "token",
        tables: ["datasets"],
      }),
    ).rejects.toThrow();

    const rows = db.query<{ id: string }, []>("select id from datasets").all();
    expect(rows).toEqual([]);
    db.close();
  });
});
