import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openSqliteDatabase, runMigrations } from "../../SqliteService/Sqlite";
import { bootstrapSnapshotIfNeeded } from "../SnapshotBootstrap";
import { makeRest } from "./SnapshotBootstrap.fixtures";

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
      .query<{ id: string; name: string }, []>(
        "select id, name from datasets order by id",
      )
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

  it("treats an empty Supabase response on a live, empty table as a no-op", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    const { rest, calls } = makeRest({ datasets: [] });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });

    // The table was queried (it is in the live schema and has no rows),
    // but the empty response produced no inserts and no error.
    expect(calls).toEqual(["datasets"]);
    const rows = db.query<{ id: string }, []>("select id from datasets").all();
    expect(rows).toEqual([]);
    db.close();
  });

  it("stringifies object-valued columns before insert (jsonb mirror)", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table dashboards (id text primary key, config text not null);",
      },
    ]);
    const { rest } = makeRest({
      dashboards: [{ id: "d1", config: { layout: "grid", widgets: [1, 2] } }],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["dashboards"],
    });

    const rows = db
      .query<{ id: string; config: string }, []>(
        "select id, config from dashboards",
      )
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
      .query<{ id: string; ok: number }, []>(
        "select id, ok from flags order by id",
      )
      .all();
    expect(rows).toEqual([
      { id: "x", ok: 1 },
      { id: "y", ok: 0 },
    ]);
    db.close();
  });

  it("preserves NULL cell values as NULL in SQLite", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key, description text);",
      },
    ]);
    const { rest } = makeRest({
      datasets: [
        { id: "a", description: "an alpha" },
        { id: "b", description: null },
      ],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });

    const rows = db
      .query<{ id: string; description: string | null }, []>(
        "select id, description from datasets order by id",
      )
      .all();
    expect(rows).toEqual([
      { id: "a", description: "an alpha" },
      { id: "b", description: null },
    ]);
    db.close();
  });

  it("omits generated columns from dense Supabase rows", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: `create table dashboards (
          id text primary key,
          visibility text not null,
          is_public integer generated always as (
            case when visibility = 'public' then 1 else 0 end
          ) virtual
        );`,
      },
    ]);
    const { rest } = makeRest({
      dashboards: [
        { id: "public", visibility: "public", is_public: true },
        { id: "draft", visibility: "draft", is_public: false },
      ],
    });

    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["dashboards"],
    });

    const rows = db
      .query<{ id: string; is_public: number; visibility: string }, []>(
        "select id, visibility, is_public from dashboards order by id",
      )
      .all();
    expect(rows).toEqual([
      { id: "draft", visibility: "draft", is_public: 0 },
      { id: "public", visibility: "public", is_public: 1 },
    ]);
    db.close();
  });
});
