import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/*
 * Runs exportCatalogData.sh and importCatalogData.sh, which share
 * catalogTables.sh, against fake `pg_dump` and `psql` binaries passed through
 * PG_DUMP_BIN and PSQL_BIN. Nothing here connects to a database: the fakes
 * log their arguments and answer the row-count queries from a temp folder.
 */

const SCRIPTS_DIR = resolve(__dirname, "..");
const TARGET_URL =
  "postgresql://postgres:s3cret-pass@db.example-ref.supabase.co:5432/postgres";
const TARGET_ID = "postgres@db.example-ref.supabase.co";

const CATALOG_DUMP = `--
-- PostgreSQL database dump
--

\\restrict abc123

SET statement_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SELECT pg_catalog.set_config('search_path', '', false);

COPY public.data_catalog_drives (id, pipeline_name, drive_key) FROM stdin;
d1\tsocrata\thttps://data.example.org
\\.

COPY public.data_catalog_listings (id, display_name, drive_id) FROM stdin;
l1\tCases\td1
l2\tDeaths\td1
\\.

COPY public.data_catalog_listings__relation_columns (id, catalog_listing_id) FROM stdin;
c1\tl1
c2\tl1
c3\tl2
\\.

COPY public.data_catalog_facet_counts (id, facet, value, listing_count) FROM stdin;
1\tsource\tsocrata\t2
\\.

SELECT pg_catalog.setval('public.data_catalog_facet_counts_id_seq', 1, true);

COPY public.pipeline_executions (id, pipeline_name) FROM stdin;
e1\tsocrata
\\.

COPY public.pipeline_execution_scopes (id, execution_id, pipeline_name) FROM stdin;
s1\te1\tsocrata
\\.

COPY public.pipeline_scope_checkpoints (pipeline_name, drive_key, scope_key) FROM stdin;
\\.

\\unrestrict abc123
`;

const FAKE_PG_DUMP = `#!/bin/bash
printf '%s\\n' "$*" >> "$FAKE_LOG"
while (($#)); do
  if [[ "$1" == "--file" ]]; then
    printf '%s%s' "$FAKE_DUMP_CONTENT" "\${FAKE_DUMP_EXTRA:-}" > "$2"
  fi
  shift
done
`;

const FAKE_PSQL = `#!/bin/bash
printf '%s\\n' "$*" >> "$FAKE_LOG"
query=""
while (($#)); do
  case "$1" in
    --file) echo "$2" > "$FAKE_STATE/imported"; exit 0 ;;
    -c) query="$2"; shift ;;
  esac
  shift
done
table="\${query#select count(*) from }"
if [[ -f "$FAKE_STATE/imported" ]]; then
  source "$CATALOG_TABLES_SH"
  count_dump_rows "$(cat "$FAKE_STATE/imported")" "$table"
else
  echo "\${FAKE_TARGET_ROWS:-0}"
fi
`;

let workDir = "";

function _writeExecutable(name: string, content: string): string {
  const path = join(workDir, name);
  writeFileSync(path, content);
  chmodSync(path, 0o755);
  return path;
}

function _runScript(
  script: string,
  args: readonly string[],
  env: Record<string, string> = {},
) {
  const result = spawnSync("bash", [join(SCRIPTS_DIR, script), ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH ?? "",
      PG_DUMP_BIN: join(workDir, "pg_dump"),
      PSQL_BIN: join(workDir, "psql"),
      FAKE_LOG: join(workDir, "calls.log"),
      FAKE_STATE: workDir,
      FAKE_DUMP_CONTENT: CATALOG_DUMP,
      CATALOG_TABLES_SH: join(SCRIPTS_DIR, "catalogTables.sh"),
      ...env,
    },
  });
  const log = existsSync(join(workDir, "calls.log"))
    ? readFileSync(join(workDir, "calls.log"), "utf8")
    : "";
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    log,
  };
}

function _writeDump(content: string = CATALOG_DUMP): string {
  const path = join(workDir, "catalog.sql");
  writeFileSync(path, content);
  return path;
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "catalog-data-scripts-"));
  _writeExecutable("pg_dump", FAKE_PG_DUMP);
  _writeExecutable("psql", FAKE_PSQL);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("exportCatalogData.sh", () => {
  it("dumps only the catalog tables, data only and without disabling triggers", () => {
    const outFile = join(workDir, "out.sql");

    const run = _runScript("exportCatalogData.sh", ["postgres://src", outFile]);

    expect(run.status).toBe(0);
    expect(run.log).toContain("--data-only");
    expect(run.log).not.toContain("--disable-triggers");
    expect(run.log.match(/--table public\.[a-z_]+/g)).toEqual([
      "--table public.data_catalog_drives",
      "--table public.data_catalog_listings",
      "--table public.data_catalog_listings__relation_columns",
      "--table public.data_catalog_facet_counts",
      "--table public.pipeline_executions",
      "--table public.pipeline_execution_scopes",
      "--table public.pipeline_scope_checkpoints",
    ]);
  });

  it("prints each table's row count from the dump", () => {
    const run = _runScript("exportCatalogData.sh", [
      "postgres://src",
      join(workDir, "out.sql"),
    ]);

    expect(run.output).toContain("public.data_catalog_listings: 2");
    expect(run.output).toContain(
      "public.data_catalog_listings__relation_columns: 3",
    );
    expect(run.output).toContain("public.pipeline_scope_checkpoints: 0");
  });

  it("drops the transaction_timeout setting that Postgres before 17 rejects", () => {
    const outFile = join(workDir, "out.sql");

    _runScript("exportCatalogData.sh", ["postgres://src", outFile]);

    const dump = readFileSync(outFile, "utf8");
    expect(dump).toContain("SET statement_timeout = 0;");
    expect(dump).not.toContain("transaction_timeout");
  });

  it("refuses to overwrite an existing file without calling pg_dump", () => {
    const outFile = _writeDump("keep me");

    const run = _runScript("exportCatalogData.sh", ["postgres://src", outFile]);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
    expect(readFileSync(outFile, "utf8")).toBe("keep me");
  });

  it("fails when the dump holds a table outside the catalog", () => {
    const run = _runScript(
      "exportCatalogData.sh",
      ["postgres://src", join(workDir, "out.sql")],
      { FAKE_DUMP_EXTRA: "COPY public.workspaces (id) FROM stdin;\nw1\n\\.\n" },
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain("COPY public.workspaces");
  });
});

describe("importCatalogData.sh", () => {
  it("loads the dump in one transaction that stops on the first error", () => {
    const dump = _writeDump();

    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      dump,
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(0);
    expect(run.log).toContain(
      `--single-transaction --set ON_ERROR_STOP=1 --file ${dump}`,
    );
  });

  it("prints each table's row count in the target after the import", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.output).toMatch(/After the import[\s\S]*listings: 2/);
  });

  it("refuses a target whose catalog tables have rows, without loading the dump", () => {
    const run = _runScript(
      "importCatalogData.sh",
      [TARGET_URL, _writeDump(), "--yes-i-know-the-target", TARGET_ID],
      { FAKE_TARGET_ROWS: "6" },
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain("already has rows");
    expect(run.log).not.toContain("--file");
  });

  it("refuses a confirmation that names another target, without connecting", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(),
      "--yes-i-know-the-target",
      "postgres@db.other-ref.supabase.co",
    ]);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
  });

  it("refuses without a confirmation when there is no terminal to ask on", () => {
    const run = _runScript("importCatalogData.sh", [TARGET_URL, _writeDump()]);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
  });

  it("refuses an empty dump file without connecting", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(""),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
  });

  it("refuses a dump that does more than load catalog rows, without connecting", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(`${CATALOG_DUMP}DROP TABLE public.workspaces;\n`),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("DROP TABLE public.workspaces");
    expect(run.log).toBe("");
  });

  it("never prints the target's password", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.output).toContain(TARGET_ID);
    expect(run.output).not.toContain("s3cret-pass");
  });
});
