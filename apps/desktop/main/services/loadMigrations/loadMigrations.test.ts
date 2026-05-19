import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadMigrationsFromDir } from "./loadMigrations.ts";

describe("loadMigrationsFromDir", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "avandar-load-migrations-"));
  });

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("returns sorted `.gen.sql` files with their file contents", () => {
    writeFileSync(join(dir, "002_b.gen.sql"), "create table b (id text);");
    writeFileSync(join(dir, "001_a.gen.sql"), "create table a (id text);");
    writeFileSync(join(dir, "003_c.gen.sql"), "create table c (id text);");

    const migrations = loadMigrationsFromDir(dir);

    expect(migrations).toEqual([
      { name: "001_a.gen.sql", sql: "create table a (id text);" },
      { name: "002_b.gen.sql", sql: "create table b (id text);" },
      { name: "003_c.gen.sql", sql: "create table c (id text);" },
    ]);
  });

  it("ignores files that are not `.gen.sql`", () => {
    writeFileSync(join(dir, "001_init.gen.sql"), "create table a (id text);");
    writeFileSync(join(dir, "README.md"), "# notes");
    writeFileSync(join(dir, "002_init.sql"), "create table b (id text);");
    writeFileSync(join(dir, "002_init.gen.sql.bak"), "old");

    const migrations = loadMigrationsFromDir(dir);

    expect(migrations.map((m) => m.name)).toEqual(["001_init.gen.sql"]);
  });

  it("ignores subdirectories", () => {
    writeFileSync(join(dir, "001_init.gen.sql"), "create table a (id text);");
    mkdirSync(join(dir, "subdir"));
    writeFileSync(
      join(dir, "subdir", "999_nested.gen.sql"),
      "create table nested (id text);",
    );

    const migrations = loadMigrationsFromDir(dir);

    expect(migrations.map((m) => m.name)).toEqual(["001_init.gen.sql"]);
  });

  it("returns an empty list when the directory is empty", () => {
    const migrations = loadMigrationsFromDir(dir);
    expect(migrations).toEqual([]);
  });

  it("throws when the directory does not exist", () => {
    expect(() => loadMigrationsFromDir(join(dir, "missing"))).toThrow();
  });
});
