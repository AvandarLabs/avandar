import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSqliteDatabase, runMigrations } from "../../SqliteService/Sqlite";
import { bootstrapSnapshotIfNeeded } from "../SnapshotBootstrap";
import { makeRest } from "./SnapshotBootstrap.fixtures";

describe("bootstrapSnapshotIfNeeded transactions", () => {
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

  it("restores `foreign_keys = ON` after a successful bootstrap", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    const fkBefore = db
      .query<{ foreign_keys: number }, []>("pragma foreign_keys;")
      .get();
    expect(fkBefore?.foreign_keys).toBe(1);

    const { rest } = makeRest({ datasets: [{ id: "a" }] });
    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });

    const fkAfter = db
      .query<{ foreign_keys: number }, []>("pragma foreign_keys;")
      .get();
    expect(fkAfter?.foreign_keys).toBe(1);
    db.close();
  });

  it("restores `foreign_keys = ON` even when bootstrap fails mid-batch", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key not null);",
      },
    ]);
    const { rest } = makeRest({
      datasets: [{ id: "a" }, { id: null }],
    });

    await expect(
      bootstrapSnapshotIfNeeded({
        db,
        rest,
        accessToken: "token",
        tables: ["datasets"],
      }),
    ).rejects.toThrow();

    const fkAfter = db
      .query<{ foreign_keys: number }, []>("pragma foreign_keys;")
      .get();
    expect(fkAfter?.foreign_keys).toBe(1);
    db.close();
  });

  it("leaves `foreign_keys = OFF` when the caller had it off on entry", async () => {
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    db.run("pragma foreign_keys = OFF;");

    const { rest } = makeRest({ datasets: [{ id: "a" }] });
    await bootstrapSnapshotIfNeeded({
      db,
      rest,
      accessToken: "token",
      tables: ["datasets"],
    });

    const fkAfter = db
      .query<{ foreign_keys: number }, []>("pragma foreign_keys;")
      .get();
    expect(fkAfter?.foreign_keys).toBe(0);
    db.close();
  });

  it("persists earlier tables' inserts when a later table's batch fails", async () => {
    // Each table is bootstrapped inside its own transaction, so a
    // failure on table N leaves tables 1..N-1 durable. On the next
    // launch, those tables are already-populated and the bootstrap
    // resumes from table N.
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql:
          "create table workspaces (id text primary key);" +
          "create table datasets (id text primary key not null);",
      },
    ]);
    const { rest } = makeRest({
      workspaces: [{ id: "w1" }, { id: "w2" }],
      datasets: [{ id: "d1" }, { id: null }], // second row violates not-null
    });

    await expect(
      bootstrapSnapshotIfNeeded({
        db,
        rest,
        accessToken: "token",
        tables: ["workspaces", "datasets"],
      }),
    ).rejects.toThrow();

    const workspaces = db
      .query<{ id: string }, []>("select id from workspaces order by id")
      .all();
    expect(workspaces).toEqual([{ id: "w1" }, { id: "w2" }]);

    const datasets = db
      .query<{ id: string }, []>("select id from datasets")
      .all();
    expect(datasets).toEqual([]);
    db.close();
  });
});
