import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/*
 * Runs exportCatalogData.sh and importCatalogData.sh, which share
 * catalogTables.sh, against fake `pg_dump` and `psql` binaries passed through
 * PG_DUMP_BIN and PSQL_BIN. Nothing here connects to a database: the fakes
 * log their arguments, answer the read-only report queries from environment
 * variables, and keep the import wrapper the script hands to `psql --file`.
 */

const SCRIPTS_DIR = resolve(__dirname, "..");
const TARGET_URL =
  "postgresql://postgres:s3cret-pass@db.example-ref.supabase.co:5432/postgres";
const TARGET_ID = "postgres@db.example-ref.supabase.co";

/** Separates the fields of one dependents-report row, as `psql -F` does. */
const FIELD_SEPARATOR = "\u001f";

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

COPY public.data_catalog_listings (display_name, id, drive_id) FROM stdin;
Cases\tl1\td1
Deaths\tl2\td1
\\.

COPY public.data_catalog_listings__relation_columns (id, catalog_listing_id) FROM stdin;
c1\tl1
c2\tl1
c3\tl2
\\.

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

const BACKUP_DUMP = `--
-- PostgreSQL database dump
--
${[
  "public.data_catalog_drives",
  "public.data_catalog_listings",
  "public.data_catalog_listings__relation_columns",
  "public.pipeline_executions",
  "public.pipeline_execution_scopes",
  "public.pipeline_scope_checkpoints",
  "public.data_catalog_facet_counts",
  "public.datasets__open_data",
]
  .map((table) => {
    return `COPY ${table} (id) FROM stdin;\n\\.\n`;
  })
  .join("\n")}`;

/** The `datasets__open_data` cascade row, as the report query prints it. */
const OPEN_DATA_DEPENDENT = [
  "1",
  "public.datasets__open_data",
  "catalog_listing_id",
  "public.data_catalog_listings",
  "c",
  "select * from public.datasets__open_data where (catalog_listing_id) in (select id from public.data_catalog_listings)",
].join(FIELD_SEPARATOR);

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
    --file)
      cp "$2" "$FAKE_STATE/wrapper.sql"
      touch "$FAKE_STATE/imported"
      exit "\${FAKE_IMPORT_EXIT:-0}"
      ;;
    -c) query="$2"; shift ;;
  esac
  shift
done
case "$query" in
  *pg_constraint*) printf '%s' "\${FAKE_DEPENDENTS:-}" ;;
  "select count(*) from ("*) echo "\${FAKE_DEPENDENT_ROWS:-0}" ;;
  "select id from public.data_catalog_listings"*)
    printf '%s' "\${FAKE_TARGET_IDS:-}"
    ;;
  "select count(*) from "*)
    table="\${query#select count(*) from }"
    if [[ -f "$FAKE_STATE/imported" ]]; then
      source "$CATALOG_TABLES_SH"
      count_dump_rows "$FAKE_STATE/catalog.sql" "$table"
    else
      echo "\${FAKE_TARGET_ROWS:-0}"
    fi
    ;;
esac
`;

let workDir = "";

function _writeExecutable(name: string, content: string): void {
  const path = join(workDir, name);
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

function _readIfPresent(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
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
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    log: _readIfPresent(join(workDir, "calls.log")),
    wrapper: _readIfPresent(join(workDir, "wrapper.sql")),
  };
}

function _writeDump(content: string = CATALOG_DUMP): string {
  const path = join(workDir, "catalog.sql");
  writeFileSync(path, content);
  return path;
}

function _writeBackup(content: string = BACKUP_DUMP): string {
  const path = join(workDir, "backup.sql");
  writeFileSync(path, content);
  return path;
}

/** Runs a replace import of the standard dump with these extra arguments. */
function _runReplace(
  extraArgs: readonly string[],
  env: Record<string, string> = {},
) {
  return _runScript(
    "importCatalogData.sh",
    [TARGET_URL, _writeDump(), "--replace-existing", ...extraArgs],
    {
      FAKE_TARGET_ROWS: "6",
      FAKE_DEPENDENTS: `${OPEN_DATA_DEPENDENT}\n`,
      FAKE_DEPENDENT_ROWS: "4",
      ...env,
    },
  );
}

/** The arguments of a replace import that passes every gate. */
function _confirmedReplaceArgs(): string[] {
  return [
    "--backup-file",
    _writeBackup(),
    "--yes-i-know-the-target",
    TARGET_ID,
    "--yes-i-know-the-cascade",
    "4",
  ];
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

describe("importCatalogData.sh into an empty target", () => {
  it("loads the dump in one transaction that stops on the first error", () => {
    const dump = _writeDump();

    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      dump,
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(0);
    expect(run.log).toMatch(
      /--single-transaction --set ON_ERROR_STOP=1 --file \S+/,
    );
  });

  it("loads the dump and then refreshes the facet counts, deleting nothing", () => {
    const dump = _writeDump();

    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      dump,
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.wrapper.trim().split("\n")).toEqual([
      "\\set ON_ERROR_STOP on",
      `\\i '${dump}'`,
      "select public.data_catalog_facet_counts__refresh();",
    ]);
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
    expect(run.output).toContain(
      "but the target is postgres@db.example-ref.supabase.co",
    );
    expect(run.log).toBe("");
  });

  it("refuses without a confirmation when there is no terminal to ask on", () => {
    const run = _runScript("importCatalogData.sh", [TARGET_URL, _writeDump()]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "no terminal to confirm on. Pass --yes-i-know-the-target",
    );
    expect(run.log).not.toContain("--file");
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

  it("refuses a dump that carries facet counts, without connecting", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL,
      _writeDump(
        `${CATALOG_DUMP}COPY public.data_catalog_facet_counts (id) FROM stdin;\n1\n\\.\n`,
      ),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("COPY public.data_catalog_facet_counts");
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

describe("importCatalogData.sh --replace-existing", () => {
  it("deletes the catalog children first, loads the dump, and refreshes, in one transaction", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.status).toBe(0);
    expect(run.log).toMatch(
      /--single-transaction --set ON_ERROR_STOP=1 --file \S+/,
    );
    expect(run.wrapper.trim().split("\n")).toEqual([
      "\\set ON_ERROR_STOP on",
      "delete from public.pipeline_scope_checkpoints;",
      "delete from public.pipeline_execution_scopes;",
      "delete from public.pipeline_executions;",
      "delete from public.data_catalog_listings__relation_columns;",
      "delete from public.data_catalog_listings;",
      "delete from public.data_catalog_drives;",
      `\\i '${join(workDir, "catalog.sql")}'`,
      "select public.data_catalog_facet_counts__refresh();",
    ]);
  });

  it("reports each dependent table and the rows the cascade deletes", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toMatch(
      /public\.datasets__open_data\.\(catalog_listing_id\) -> public\.data_catalog_listings: on delete cascade, 4 rows deleted/,
    );
  });

  it("reports the target's listing ids the dump does not hold", () => {
    const run = _runReplace(["--dry-run"], {
      FAKE_TARGET_IDS: "l1\nold-1\nold-2\n",
    });

    expect(run.output).toMatch(
      /2 listing ids in the target are not in the dump[\s\S]*old-1[\s\S]*old-2/,
    );
  });

  it("refuses without a backup file and prints the pg_dump command that makes one", () => {
    const run = _runReplace([
      "--yes-i-know-the-target",
      TARGET_ID,
      "--yes-i-know-the-cascade",
      "4",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("--replace-existing needs --backup-file");
    expect(run.output).toContain(
      'pg_dump "$TARGET_DB_URL" --data-only --no-owner --no-privileges',
    );
    expect(run.output).toContain("--table public.datasets__open_data");
    expect(run.log).not.toContain("--file");
  });

  it("refuses a backup older than 24 hours", () => {
    const backup = _writeBackup();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    utimesSync(backup, twoDaysAgo, twoDaysAgo);

    const run = _runReplace([
      "--backup-file",
      backup,
      "--yes-i-know-the-target",
      TARGET_ID,
      "--yes-i-know-the-cascade",
      "4",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("is older than 24 hours");
    expect(run.log).not.toContain("--file");
  });

  it("refuses a backup that lacks a dependent table", () => {
    const run = _runReplace([
      "--backup-file",
      _writeBackup(BACKUP_DUMP.replace("public.datasets__open_data", "x")),
      "--yes-i-know-the-target",
      TARGET_ID,
      "--yes-i-know-the-cascade",
      "4",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "has no rows block for public.datasets__open_data",
    );
    expect(run.output).toContain("public.datasets__open_data");
    expect(run.log).not.toContain("--file");
  });

  it("refuses a cascade confirmation with another row count", () => {
    const run = _runReplace([
      "--backup-file",
      _writeBackup(),
      "--yes-i-know-the-target",
      TARGET_ID,
      "--yes-i-know-the-cascade",
      "3",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "--yes-i-know-the-cascade says 3, but it must be 4",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses a target confirmation for another target", () => {
    const run = _runReplace([
      "--backup-file",
      _writeBackup(),
      "--yes-i-know-the-target",
      "postgres@db.other-ref.supabase.co",
      "--yes-i-know-the-cascade",
      "4",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "but the target is postgres@db.example-ref.supabase.co",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses without the cascade confirmation when there is no terminal", () => {
    const run = _runReplace([
      "--backup-file",
      _writeBackup(),
      "--yes-i-know-the-target",
      TARGET_ID,
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "no terminal to confirm on. Pass --yes-i-know-the-cascade 4",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses when a restricting foreign key has rows that would block the delete", () => {
    const restrictingDependent = OPEN_DATA_DEPENDENT.replace(
      `${FIELD_SEPARATOR}c${FIELD_SEPARATOR}`,
      `${FIELD_SEPARATOR}a${FIELD_SEPARATOR}`,
    );

    const run = _runReplace(_confirmedReplaceArgs(), {
      FAKE_DEPENDENTS: `${restrictingDependent}\n`,
      FAKE_DEPENDENT_ROWS: "2",
    });

    expect(run.status).toBe(1);
    expect(run.output).toContain("would block the delete");
    expect(run.output).toContain("no action");
    expect(run.log).not.toContain("--file");
  });

  it("writes nothing on --dry-run and exits 0", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.status).toBe(0);
    expect(run.output).toContain("Dry run");
    expect(run.log).not.toContain("--file");
  });
});
