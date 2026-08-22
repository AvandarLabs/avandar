import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openSqliteDatabase, runMigrations } from "./Sqlite";

describe("Sqlite", () => {
  let dir = "";

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("opens a database file at the given path", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    db.run("create table foo (id text primary key);");
    db.run("insert into foo (id) values ('a');");
    const rows = db.query<{ id: string }, []>("select id from foo").all();
    expect(rows).toEqual([{ id: "a" }]);
    db.close();
  });

  it("openSqliteDatabase creates parent directories", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const dbPath = join(dir, "nested", "deep", "test.sqlite");
    const db = openSqliteDatabase(dbPath);
    db.run("create table foo (id integer primary key);");
    db.close();
  });

  it("openSqliteDatabase enables WAL mode and foreign keys", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    const journal = db
      .query<{ journal_mode: string }, []>("pragma journal_mode;")
      .get();
    expect(journal?.journal_mode).toBe("wal");

    const fk = db
      .query<{ foreign_keys: number }, []>("pragma foreign_keys;")
      .get();
    expect(fk?.foreign_keys).toBe(1);

    db.close();
  });

  it("runMigrations applies pending files in order and is idempotent", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    const migrations = [
      {
        name: "001_init.sql",
        sql: "create table widgets (id integer primary key, name text);",
      },
      {
        name: "002_add_color.sql",
        sql: "alter table widgets add column color text;",
      },
    ];

    runMigrations(db, migrations);
    runMigrations(db, migrations);

    db.run("insert into widgets (name, color) values ('a', 'red');");
    const rows = db
      .query<{ name: string; color: string }, []>(
        "select name, color from widgets",
      )
      .all();
    expect(rows).toEqual([{ name: "a", color: "red" }]);

    const applied = db
      .query<{ name: string }, []>(
        "select name from _schema_migrations order by name",
      )
      .all();
    expect(applied).toEqual([
      { name: "001_init.sql" },
      { name: "002_add_color.sql" },
    ]);

    db.close();
  });

  it("runMigrations refuses to skip files (would indicate missing migrations)", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    runMigrations(db, [
      {
        name: "001_init.sql",
        sql: "create table widgets (id integer primary key);",
      },
    ]);

    expect(() => {
      runMigrations(db, [
        {
          name: "002_add_color.sql",
          sql: "alter table widgets add column color text;",
        },
      ]);
    }).toThrow(/migration history mismatch/i);

    db.close();
  });

  it("runMigrations rolls back the entire batch when a later statement fails", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    expect(() => {
      runMigrations(db, [
        {
          name: "001_init.sql",
          sql: "create table widgets (id integer primary key);",
        },
        {
          name: "002_bad.sql",
          sql: "this is not valid sql;",
        },
      ]);
    }).toThrow();

    const tables = db
      .query<{ name: string }, []>(
        "select name from sqlite_master where type='table' and name='widgets'",
      )
      .all();
    expect(tables).toEqual([]);

    const applied = db
      .query<{ name: string }, []>("select name from _schema_migrations")
      .all();
    expect(applied).toEqual([]);

    db.close();
  });

  it("runMigrations records comment-only migrations without executing them", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    runMigrations(db, [
      {
        name: "001_pure_comment.gen.sql",
        sql:
          "-- Generated from supabase/migrations/foo.sql\n" +
          "-- Schema-shape statements emitted: 0\n",
      },
      {
        name: "002_init.gen.sql",
        sql: "create table widgets (id integer primary key);",
      },
    ]);

    db.run("insert into widgets (id) values (1);");
    const rows = db.query<{ id: number }, []>("select id from widgets").all();
    expect(rows).toEqual([{ id: 1 }]);

    const applied = db
      .query<{ name: string }, []>(
        "select name from _schema_migrations order by name",
      )
      .all();
    expect(applied).toEqual([
      { name: "001_pure_comment.gen.sql" },
      { name: "002_init.gen.sql" },
    ]);

    db.close();
  });

  it("runMigrations handles an empty input as a no-op", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    runMigrations(db, []);

    const tables = db
      .query<{ name: string }, []>(
        "select name from sqlite_master where type='table' and name='_schema_migrations'",
      )
      .all();
    expect(tables).toEqual([{ name: "_schema_migrations" }]);

    db.close();
  });
});
