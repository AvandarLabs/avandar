import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runGenerator } from "./runGenerator";

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.forEach((temporaryDirectory) => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });
  temporaryDirectories.length = 0;
});

function _createTemporaryDirectory(prefix: string): string {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(temporaryDirectory);
  return temporaryDirectory;
}

function _generateMigration(
  options: Readonly<{ migrationSql: string; sourceFile: string }>,
): string {
  const sourceDirectory = _createTemporaryDirectory("ava-sqlite-source-");
  const outputDirectory = _createTemporaryDirectory("ava-sqlite-output-");
  writeFileSync(
    join(sourceDirectory, options.sourceFile),
    options.migrationSql,
  );
  runGenerator({ sourceDirectory, outputDirectory });
  return join(
    outputDirectory,
    options.sourceFile.replace(/\.sql$/, ".gen.sql"),
  );
}

function _runGeneratedMigration(
  options: Readonly<{ generatedPath: string; sqliteScript: string }>,
) {
  return spawnSync("bun", ["-e", options.sqliteScript, options.generatedPath], {
    encoding: "utf8",
  });
}

function _assertVisibilityMigrationOutput(generatedPath: string): void {
  const generated = readFileSync(generatedPath, "utf8");
  expect(generated).toContain(
    'alter table "dashboards" add column "visibility" text not null default \'draft\';',
  );
  expect(generated).toContain(
    'alter table "dashboards" add column "is_public" integer generated always as (',
  );
  expect(generated).toContain(") virtual;");
  expect(generated).not.toMatch(/\ncreate type\b/i);
  expect(generated).not.toMatch(/\n\) stored\b/i);
}

function _assertVisibilityMigrationExecution(generatedPath: string): void {
  const sqliteResult = _runGeneratedMigration({
    generatedPath,
    sqliteScript: `import { Database } from "bun:sqlite";
     import { readFileSync } from "node:fs";
     const db = new Database(":memory:");
     db.exec("create table dashboards (id text primary key, workspace_id text not null, slug text, is_public integer not null default 0)");
     db.exec("create unique index dashboards__slug_unique_when_public on dashboards(slug) where is_public = 1");
     db.exec("insert into dashboards values ('public', 'workspace', 'public-slug', 1), ('draft', 'workspace', 'draft-slug', 0)");
     db.exec(readFileSync(process.argv[1], "utf8"));
     const rows = db.query("select id, visibility, is_public from dashboards order by id").all();
     const indexes = db.query("select name from sqlite_master where type = 'index' and name like 'dashboards__slug_unique%' order by name").all();
     console.log(JSON.stringify({ rows, indexes }));`,
  });
  expect(sqliteResult.status, sqliteResult.stderr).toBe(0);
  expect(JSON.parse(sqliteResult.stdout)).toEqual({
    rows: [
      { id: "draft", visibility: "draft", is_public: 0 },
      { id: "public", visibility: "public", is_public: 1 },
    ],
    indexes: [
      { name: "dashboards__slug_unique_per_workspace_when_internal" },
      { name: "dashboards__slug_unique_when_public" },
    ],
  });
}

function _assertSnapshotRevisionMigration(generatedPath: string): void {
  const generated = readFileSync(generatedPath, "utf8");
  expect(generated).toContain(
    `set "snapshot_revision" = '00000000-0000-0000-0000-000000000000'`,
  );
  const sqliteResult = _runGeneratedMigration({
    generatedPath,
    sqliteScript: `import { Database } from "bun:sqlite";
     import { readFileSync } from "node:fs";
     const db = new Database(":memory:");
     db.exec("create table dashboards (id text primary key, visibility text not null)");
     db.exec("insert into dashboards values ('public', 'public'), ('draft', 'draft')");
     db.exec(readFileSync(process.argv[1], "utf8"));
     console.log(JSON.stringify(db.query("select id, snapshot_revision from dashboards order by id").all()));`,
  });
  expect(sqliteResult.status, sqliteResult.stderr).toBe(0);
  expect(JSON.parse(sqliteResult.stdout)).toEqual([
    { id: "draft", snapshot_revision: null },
    {
      id: "public",
      snapshot_revision: "00000000-0000-0000-0000-000000000000",
    },
  ]);
}

describe("runGenerator", () => {
  it("applies the dashboard visibility override to the historical schema", () => {
    const sourceFile = "20260814175823_dashboard_visibility_model.sql";
    const generatedPath = _generateMigration({
      migrationSql: `create type public.dashboard_visibility as enum ('draft', 'workspace', 'public');

alter table public.dashboards
add column visibility public.dashboard_visibility not null default 'draft';

update public.dashboards
set visibility = 'public'::public.dashboard_visibility
where is_public = true;

alter table public.dashboards
drop column is_public;

alter table public.dashboards
add column is_public boolean generated always as (
  visibility = 'public'::public.dashboard_visibility
) stored not null;`,
      sourceFile,
    });
    _assertVisibilityMigrationOutput(generatedPath);
    _assertVisibilityMigrationExecution(generatedPath);
  });

  it("backfills the legacy snapshot revision in generated SQLite", () => {
    const sourceFile = "20260815022608_add_dashboard_snapshot_revision.sql";
    const generatedPath = _generateMigration({
      migrationSql: `alter table public.dashboards add column snapshot_revision uuid;

update public.dashboards
set snapshot_revision = '00000000-0000-0000-0000-000000000000'::uuid
where visibility <> 'draft'::public.dashboard_visibility
  and snapshot_revision is null;`,
      sourceFile,
    });
    _assertSnapshotRevisionMigration(generatedPath);
  });
});
