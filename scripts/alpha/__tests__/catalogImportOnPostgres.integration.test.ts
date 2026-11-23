import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/*
 * Runs importCatalogData.sh against a throwaway Postgres cluster on this
 * machine, to prove the real delete, cascade, Storage rewrite, and rollback
 * behaviour. It needs `initdb`, `pg_ctl`, and `pg_dump` (from
 * CATALOG_TEST_PG_BIN_DIR or a Homebrew `postgresql@*` install) and a psql
 * new enough for the import (CATALOG_TEST_PSQL or Homebrew's `libpq@18`),
 * and skips when they are missing, as in CI. The cluster listens on
 * 127.0.0.1 only and is deleted afterwards.
 */

const SCRIPTS_DIR = resolve(__dirname, "..");
const OWNER = "catalog_owner";
const TARGET_ID = `${OWNER}@127.0.0.1`;
const SOURCE_STORAGE = "demo-ref.supabase.co";
const TARGET_STORAGE = "local-ref.supabase.co";

const SCHEMA_SQL = `
create table public.data_catalog_drives (id uuid primary key, pipeline_name text not null);
create table public.data_catalog_listings (
  id uuid primary key,
  display_name text,
  drive_id uuid references public.data_catalog_drives (id) on delete set null,
  canonical_urls text[]
);
create table public.data_catalog_listings__relation_columns (
  id uuid primary key,
  catalog_listing_id uuid not null references public.data_catalog_listings (id) on delete cascade
);
create table public.data_catalog_facet_counts (
  id bigint generated always as identity primary key,
  facet text not null,
  listing_count bigint not null
);
create table public.pipeline_executions (
  id uuid primary key,
  pipeline_name text not null,
  cli_argv text[],
  actor text,
  host text,
  unique (id, pipeline_name)
);
create table public.pipeline_execution_scopes (
  id uuid primary key,
  execution_id uuid not null,
  pipeline_name text not null,
  foreign key (execution_id, pipeline_name) references public.pipeline_executions (id, pipeline_name) on delete cascade
);
create table public.pipeline_scope_checkpoints (pipeline_name text, drive_key text, scope_key text, primary key (pipeline_name, drive_key, scope_key));
create schema auth;
create table auth.users (id uuid primary key, email text);
create table public.workspaces (id uuid primary key, name text not null);
create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade
);
create table public.datasets (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  source_type text not null,
  description_probe integer
);
create table public.dataset_columns (
  id uuid primary key,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  name text not null
);
create table public.datasets__open_data (
  id uuid primary key,
  dataset_id uuid not null unique references public.datasets (id) on delete cascade,
  workspace_id uuid not null,
  catalog_listing_id uuid not null references public.data_catalog_listings (id) on delete cascade
);
create function public.data_catalog_facet_counts__refresh () returns void as $$
begin
  lock table public.data_catalog_facet_counts in exclusive mode;
  delete from public.data_catalog_facet_counts where true;
  insert into public.data_catalog_facet_counts (facet, listing_count)
  select 'catalog', count(*) from public.data_catalog_listings;
end;
$$ language plpgsql volatile security definer set search_path = '';
revoke all on function public.data_catalog_facet_counts__refresh () from public;
`;

/**
 * 6 listings, 4 of them used by open data datasets in 2 workspaces whose
 * members all have @avandarlabs.com emails, and a fifth, uploaded dataset in
 * a third workspace with an outside member. Each dataset has 2 columns.
 */
const SEED_SQL = `
truncate public.data_catalog_drives, public.data_catalog_listings,
  public.data_catalog_listings__relation_columns, public.pipeline_executions,
  public.pipeline_execution_scopes, public.pipeline_scope_checkpoints,
  public.data_catalog_facet_counts, public.datasets__open_data, public.datasets,
  public.dataset_columns, public.workspace_memberships, public.workspaces, auth.users;
insert into public.data_catalog_drives values ('d0000000-0000-0000-0000-000000000001', 'wdi');
insert into public.data_catalog_listings (id, display_name, drive_id)
select ('a0000000-0000-0000-0000-00000000000' || n)::uuid, 'old ' || n, 'd0000000-0000-0000-0000-000000000001'
from generate_series(1, 6) n;
insert into auth.users values
  ('10000000-0000-0000-0000-000000000001', 'Pablo@AvandarLabs.com'),
  ('10000000-0000-0000-0000-000000000002', 'jp@avandarlabs.com'),
  ('10000000-0000-0000-0000-000000000009', 'outsider@example.com');
insert into public.workspaces values
  ('70000000-0000-0000-0000-000000000000', 'Even'),
  ('70000000-0000-0000-0000-000000000001', 'Odd'),
  ('70000000-0000-0000-0000-000000000002', 'Other');
insert into public.workspace_memberships (workspace_id, user_id) values
  ('70000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009');
insert into public.datasets
select ('e0000000-0000-0000-0000-00000000000' || n)::uuid,
  ('70000000-0000-0000-0000-00000000000' || case when n = 5 then 2 else n % 2 end)::uuid,
  'World Development Indicators (WDI)', case when n = 5 then 'csv_file' else 'open_data' end
from generate_series(1, 5) n;
insert into public.dataset_columns
select gen_random_uuid(), ('e0000000-0000-0000-0000-00000000000' || n)::uuid, 'column ' || c
from generate_series(1, 5) n, generate_series(1, 2) c;
insert into public.datasets__open_data
select ('f0000000-0000-0000-0000-00000000000' || n)::uuid, ('e0000000-0000-0000-0000-00000000000' || n)::uuid,
  ('70000000-0000-0000-0000-00000000000' || (n % 2))::uuid, ('a0000000-0000-0000-0000-00000000000' || n)::uuid
from generate_series(1, 4) n;
insert into public.data_catalog_facet_counts (facet, listing_count) values ('old', 99);
`;

/** A catalog dump of 3 listings, one linking to the source's Storage. */
const CATALOG_DUMP = `--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SELECT pg_catalog.set_config('search_path', '', false);

COPY public.data_catalog_drives (id, pipeline_name) FROM stdin;
d0000000-0000-0000-0000-000000000002\tsocrata
\\.

COPY public.data_catalog_listings (id, display_name, drive_id, canonical_urls) FROM stdin;
a0000000-0000-0000-0000-000000000001\tkept id\td0000000-0000-0000-0000-000000000002\t{https://data.example.org/a.csv,https://${SOURCE_STORAGE}/storage/v1/object/public/opendata/wdi/datasets/a.parquet}
b0000000-0000-0000-0000-000000000001\tnew\td0000000-0000-0000-0000-000000000002\t\\N
b0000000-0000-0000-0000-000000000002\tnew 2\t\\N\t\\N
\\.

COPY public.data_catalog_listings__relation_columns (id, catalog_listing_id) FROM stdin;
c1000000-0000-0000-0000-000000000001\tb0000000-0000-0000-0000-000000000001
\\.

COPY public.pipeline_executions (id, pipeline_name, cli_argv, actor, host) FROM stdin;
e1000000-0000-0000-0000-000000000001\tsocrata\t{run,--all}\tdeveloper@laptop.local\tlaptop.local
\\.

COPY public.pipeline_execution_scopes (id, execution_id, pipeline_name) FROM stdin;
\\.

COPY public.pipeline_scope_checkpoints (pipeline_name, drive_key, scope_key) FROM stdin;
\\.

--
-- PostgreSQL database dump complete
--
`;

const BACKUP_TABLES = [
  "public.data_catalog_drives",
  "public.data_catalog_listings",
  "public.data_catalog_listings__relation_columns",
  "public.pipeline_executions",
  "public.pipeline_execution_scopes",
  "public.pipeline_scope_checkpoints",
  "public.data_catalog_facet_counts",
  "public.datasets__open_data",
  "public.datasets",
  "public.dataset_columns",
];

/**
 * The rows the replace deletes outside the catalog: 4 `datasets__open_data`
 * rows, the 4 open data datasets, and their 8 columns.
 */
const CASCADE_ROWS = "16";

/** psql versions that know pg_dump's `\restrict`, by major version. */
const MINIMUM_PSQL_MINOR: Record<number, number> = { 15: 14, 16: 10, 17: 6 };

function _isPsqlNewEnough(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }
  const output = spawnSync(path, ["--version"], { encoding: "utf8" }).stdout;
  const match = /(\d+)\.(\d+)/.exec(output ?? "");
  const major = Number(match?.[1] ?? 0);
  const minor = Number(match?.[2] ?? 0);
  return (
    major >= 18 || (major >= 15 && minor >= (MINIMUM_PSQL_MINOR[major] ?? 0))
  );
}

/** The Postgres server tools and the psql this test uses, if present. */
function _findPostgresTools(): { binDir: string; psql: string } | undefined {
  const binDir = [
    process.env.CATALOG_TEST_PG_BIN_DIR,
    "/opt/homebrew/opt/postgresql@14/bin",
    "/opt/homebrew/opt/postgresql@16/bin",
    "/opt/homebrew/opt/postgresql@17/bin",
  ].find((dir) => {
    return (
      dir !== undefined &&
      ["initdb", "pg_ctl", "pg_dump"].every((tool) => {
        return existsSync(join(dir, tool));
      })
    );
  });
  const psql = [
    process.env.CATALOG_TEST_PSQL,
    "/opt/homebrew/opt/libpq@18/bin/psql",
    binDir === undefined ? undefined : join(binDir, "psql"),
  ].find((path) => {
    return path !== undefined && _isPsqlNewEnough(path);
  });
  return binDir === undefined || psql === undefined
    ? undefined
    : { binDir, psql };
}

const TOOLS = _findPostgresTools();

let clusterDir = "";
let port = 0;

function _run(command: string, args: readonly string[]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function _query(sql: string, user: string = OWNER): string {
  return _run(TOOLS!.psql, [
    "-h",
    "127.0.0.1",
    "-p",
    String(port),
    "-U",
    user,
    "-d",
    "postgres",
    "-X",
    "-q",
    "-t",
    "-A",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]).trim();
}

async function _getFreePort(): Promise<number> {
  return await new Promise((resolvePort) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        resolvePort(typeof address === "object" && address ? address.port : 0);
      });
    });
  });
}

function _writeFile(name: string, content: string): string {
  const path = join(clusterDir, name);
  writeFileSync(path, content);
  return path;
}

/** Writes a backup of the target with the cluster's own pg_dump. */
function _writeBackup(): string {
  const path = join(clusterDir, "backup.sql");
  _run(join(TOOLS!.binDir, "pg_dump"), [
    "-h",
    "127.0.0.1",
    "-p",
    String(port),
    "-U",
    OWNER,
    "-d",
    "postgres",
    "--data-only",
    "--no-owner",
    "--no-privileges",
    ...BACKUP_TABLES.flatMap((table) => {
      return ["--table", table];
    }),
    "--file",
    path,
  ]);
  return path;
}

/**
 * Runs a replace import of a dump with these extra arguments, through
 * PSQL_BIN, the real psql unless a test passes a stand-in.
 */
function _runImport(
  dump: string,
  extraArgs: readonly string[],
  psqlBin: string = TOOLS!.psql,
) {
  const result = spawnSync(
    "bash",
    [
      join(SCRIPTS_DIR, "importCatalogData.sh"),
      _writeFile("catalog.sql", dump),
      "--replace-existing",
      "--rewrite-storage-host",
      SOURCE_STORAGE,
      TARGET_STORAGE,
      ...extraArgs,
    ],
    {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH ?? "",
        PSQL_BIN: psqlBin,
        TARGET_DB_URL: `postgresql://${OWNER}@127.0.0.1:${port}/postgres`,
      },
    },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function _runReplace(dump: string, psqlBin?: string) {
  return _runImport(
    dump,
    [
      "--backup-file",
      _writeBackup(),
      "--yes-i-know-the-target",
      TARGET_ID,
      "--yes-i-know-the-cascade",
      CASCADE_ROWS,
    ],
    psqlBin,
  );
}

function _targetCounts(): string {
  return _query(
    "select (select count(*) from public.data_catalog_listings) || ' listings, ' || (select count(*) from public.datasets__open_data) || ' open data rows, ' || (select count(*) from public.datasets) || ' datasets, ' || (select count(*) from public.dataset_columns) || ' columns, facets ' || (select string_agg(facet || ':' || listing_count, ',') from public.data_catalog_facet_counts)",
  );
}

/** The seed's counts, which a refused or rolled-back import leaves alone. */
const SEED_COUNTS =
  "6 listings, 4 open data rows, 5 datasets, 10 columns, facets old:99";

/** Adds a member without an @avandarlabs.com email to the Odd workspace. */
const ADD_OUTSIDER_SQL =
  "insert into public.workspace_memberships (workspace_id, user_id) values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009')";

/**
 * Writes a psql stand-in that adds the outsider member right before the
 * import transaction, after the read-only report saw only Avandar members.
 */
function _writeOutsiderPsql(): string {
  const path = join(clusterDir, "psql-adds-outsider");
  writeFileSync(
    path,
    [
      "#!/bin/bash",
      'if [[ " $* " == *" --file "* ]]; then',
      `  "${TOOLS!.psql}" "$1" -X -q -v ON_ERROR_STOP=1 -c "${ADD_OUTSIDER_SQL}" >/dev/null || exit 9`,
      "fi",
      `exec "${TOOLS!.psql}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  return path;
}

/**
 * Writes a psql stand-in that, in the import transaction, right before the
 * dump loads, runs writes on a second connection that waits at most 2
 * seconds for a lock, and records whether each went through.
 */
function _writeProbingPsql(resultFile: string): string {
  const connect = `"${TOOLS!.psql}" -h 127.0.0.1 -p ${port} -U ${OWNER} -d postgres -X -q -v ON_ERROR_STOP=1 -c "set lock_timeout = '2s'"`;
  const probe = join(clusterDir, "probe.sh");
  writeFileSync(
    probe,
    [
      "#!/bin/bash",
      `try() { ${connect} -c "$2" >/dev/null 2>&1 && echo "$1: written" || echo "$1: blocked"; }`,
      "{",
      `  try "unaffected dataset update" "update public.datasets set description_probe = 1 where id = 'e0000000-0000-0000-0000-000000000005'"`,
      `  try "unaffected workspace dataset" "insert into public.datasets values ('e0000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000002', 'New', 'csv_file')"`,
      `  try "unaffected workspace member" "insert into public.workspace_memberships (workspace_id, user_id) values ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001')"`,
      `  try "affected workspace member" "insert into public.workspace_memberships (workspace_id, user_id) values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009')"`,
      `} > '${resultFile}'`,
      "",
    ].join("\n"),
  );
  const path = join(clusterDir, "psql-probes");
  writeFileSync(
    path,
    [
      "#!/bin/bash",
      'args=("$@")',
      "for ((i = 0; i < ${#args[@]}; i++)); do",
      '  if [[ "${args[i]}" == --file ]]; then',
      `    awk -v probe='${probe}' '/^\\\\i / && !done { print "\\\\! bash " probe; done = 1 } { print }' "\${args[i + 1]}" > "\${args[i + 1]}.probed"`,
      '    args[i + 1]="${args[i + 1]}.probed"',
      "  fi",
      "done",
      `exec "${TOOLS!.psql}" "\${args[@]}"`,
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  return path;
}

/**
 * Runs the restore steps the import printed: the `sed` that stages the
 * backup, then restore.sql, from a folder of their own.
 */
function _runPrintedRestore(output: string): void {
  const lines = output.split("\n");
  const sedLine = lines.find((line) => {
    return line.startsWith("       sed ");
  });
  const begin = lines.indexOf("       begin;");
  const commit = lines.indexOf("       commit;");
  const restoreDir = mkdtempSync(join(clusterDir, "restore-"));
  _run("bash", ["-c", `cd '${restoreDir}' && ${sedLine!.trim()}`]);
  writeFileSync(
    join(restoreDir, "restore.sql"),
    lines
      .slice(begin, commit + 1)
      .map((line) => {
        return line.slice(7);
      })
      .join("\n"),
  );
  _run(TOOLS!.psql, [
    "-h",
    "127.0.0.1",
    "-p",
    String(port),
    "-U",
    OWNER,
    "-d",
    "postgres",
    "-X",
    "-q",
    "-v",
    "ON_ERROR_STOP=1",
    "--file",
    join(restoreDir, "restore.sql"),
  ]);
}

/**
 * Starting a cluster and running the real import take a few seconds, more
 * while other suites run in parallel.
 */
const POSTGRES_TEST_TIMEOUT = 30_000;

describe.skipIf(TOOLS === undefined)(
  "importCatalogData.sh on a local Postgres",
  { timeout: POSTGRES_TEST_TIMEOUT },
  () => {
    beforeAll(async () => {
      clusterDir = mkdtempSync(join(tmpdir(), "catalog-import-pg-"));
      port = await _getFreePort();
      const dataDir = join(clusterDir, "data");
      _run(join(TOOLS!.binDir, "initdb"), [
        "-D",
        dataDir,
        "-U",
        "postgres",
        "-A",
        "trust",
        // A throwaway cluster needs no durability, and syncing is most of
        // initdb's time on a busy machine.
        "--no-sync",
      ]);
      _run(join(TOOLS!.binDir, "pg_ctl"), [
        "-D",
        dataDir,
        "-l",
        join(clusterDir, "server.log"),
        "-w",
        "-o",
        `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off -c synchronous_commit=off -c full_page_writes=off`,
        "start",
      ]);
      _query(`create role ${OWNER} login nosuperuser`, "postgres");
      _query(`alter database postgres owner to ${OWNER}`, "postgres");
      _query(`alter schema public owner to ${OWNER}`, "postgres");
      _query(SCHEMA_SQL);
    }, POSTGRES_TEST_TIMEOUT);

    afterAll(() => {
      if (clusterDir === "") {
        return;
      }
      spawnSync(join(TOOLS!.binDir, "pg_ctl"), [
        "-D",
        join(clusterDir, "data"),
        "-m",
        "immediate",
        "stop",
      ]);
      rmSync(clusterDir, { recursive: true, force: true });
    }, POSTGRES_TEST_TIMEOUT);

    beforeEach(() => {
      _query(SEED_SQL);
    }, POSTGRES_TEST_TIMEOUT);

    it("commits the replaced catalog, rewritten Storage URLs, and recounted facets", () => {
      const run = _runReplace(CATALOG_DUMP);

      expect(run.status, run.output).toBe(0);
      expect(_targetCounts()).toBe(
        "3 listings, 0 open data rows, 1 datasets, 2 columns, facets catalog:3",
      );
      expect(
        _query(
          "select canonical_urls[2] from public.data_catalog_listings where id = 'a0000000-0000-0000-0000-000000000001'",
        ),
      ).toBe(
        `https://${TARGET_STORAGE}/storage/v1/object/public/opendata/wdi/datasets/a.parquet`,
      );
    });

    it("rolls the deletes back when the dump fails mid-load", () => {
      const brokenDump = CATALOG_DUMP.replace(
        "c1000000-0000-0000-0000-000000000001\tb0000000-0000-0000-0000-000000000001",
        "c1000000-0000-0000-0000-000000000001\tff000000-0000-0000-0000-000000000000",
      );

      const run = _runReplace(brokenDump);

      expect(run.status).toBe(1);
      expect(run.output).toContain("its transaction rolled back");
      expect(_targetCounts()).toBe(SEED_COUNTS);
    });

    it("deletes only the open data datasets, and their columns, when every member is Avandar's", () => {
      const run = _runReplace(CATALOG_DUMP);

      expect(run.status, run.output).toBe(0);
      expect(
        _query("select string_agg(id::text, ',') from public.datasets"),
      ).toBe("e0000000-0000-0000-0000-000000000005");
      expect(run.output).toContain(
        "The @avandarlabs.com guard passes for all 4 open data datasets.",
      );
    });

    it("refuses a replace, changing nothing, when a workspace has a member outside @avandarlabs.com", () => {
      _query(ADD_OUTSIDER_SQL);

      const run = _runReplace(CATALOG_DUMP);

      expect(run.status).toBe(1);
      expect(run.output).toMatch(
        /Refusing to import: open data dataset e0000000-0000-0000-0000-00000000000[13] in workspace 70000000-0000-0000-0000-000000000001 has 1 of its 3 members without an @avandarlabs\.com email/,
      );
      expect(run.output).not.toContain("outsider@example.com");
      expect(_targetCounts()).toBe(SEED_COUNTS);
    });

    it("refuses a replace, changing nothing, when a workspace has no members", () => {
      _query(
        "delete from public.workspace_memberships where workspace_id = '70000000-0000-0000-0000-000000000000'",
      );

      const run = _runReplace(CATALOG_DUMP);

      expect(run.status).toBe(1);
      expect(run.output).toMatch(
        /Refusing to import: open data dataset e0000000-0000-0000-0000-00000000000[24] in workspace 70000000-0000-0000-0000-000000000000 has no members/,
      );
      expect(_targetCounts()).toBe(SEED_COUNTS);
    });

    it("rolls the whole transaction back when an outside member joins after the report", () => {
      const run = _runReplace(CATALOG_DUMP, _writeOutsiderPsql());

      expect(run.status).toBe(1);
      expect(run.output).toMatch(
        /Refusing to delete open data dataset e0000000-0000-0000-0000-00000000000[13] in workspace 70000000-0000-0000-0000-000000000001: 1 of its 3 members have no @avandarlabs\.com email/,
      );
      expect(run.output).toContain("its transaction rolled back");
      expect(_targetCounts()).toBe(SEED_COUNTS);
    });

    it("leaves other datasets and workspaces writable during the load, but not an affected workspace's members", () => {
      const resultFile = join(clusterDir, "probe-result.txt");

      const run = _runReplace(CATALOG_DUMP, _writeProbingPsql(resultFile));

      expect(run.status, run.output).toBe(0);
      expect(readFileSync(resultFile, "utf8").trim().split("\n")).toEqual([
        "unaffected dataset update: written",
        "unaffected workspace dataset: written",
        "unaffected workspace member: written",
        "affected workspace member: blocked",
      ]);
    });

    it("lists the open data datasets and their members on a dry run, changing nothing", () => {
      const run = _runImport(CATALOG_DUMP, ["--dry-run"]);

      expect(run.status, run.output).toBe(0);
      expect(run.output).toContain(
        'dataset e0000000-0000-0000-0000-000000000001 "World Development Indicators (WDI)" in workspace 70000000-0000-0000-0000-000000000001 "Odd"',
      );
      expect(run.output).toContain(
        "members: Pablo@AvandarLabs.com, jp@avandarlabs.com (2 of 2 have an @avandarlabs.com email), guard passes",
      );
      expect(run.output).toContain("Dry run: nothing was written.");
      expect(_targetCounts()).toBe(SEED_COUNTS);
    });

    it("loads pipeline executions with no command line, actor, or host", () => {
      const run = _runReplace(CATALOG_DUMP);

      expect(run.status, run.output).toBe(0);
      expect(
        _query(
          "select count(*) || ' executions, ' || count(cli_argv) || ' command lines, ' || count(actor) || ' actors, ' || count(host) || ' hosts' from public.pipeline_executions",
        ),
      ).toBe("1 executions, 0 command lines, 0 actors, 0 hosts");
    });

    it("restores the catalog and the deleted datasets from the printed restore steps", () => {
      const run = _runReplace(CATALOG_DUMP);
      expect(run.status, run.output).toBe(0);

      _runPrintedRestore(run.output);

      expect(_targetCounts()).toBe(SEED_COUNTS);
    });
  },
);
