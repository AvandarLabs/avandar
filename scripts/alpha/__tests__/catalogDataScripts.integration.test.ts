import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
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
 * log their arguments and the PG* variables they were started with, answer
 * the read-only report queries from environment variables, and keep the
 * import wrapper the script hands to `psql --file`.
 */

const SCRIPTS_DIR = resolve(__dirname, "..");
const TARGET_URL =
  "postgresql://postgres:s3cret-pass@db.example-ref.supabase.co:5432/postgres";
const TARGET_ID = "postgres@db.example-ref.supabase.co";
const SOURCE_STORAGE_HOST = "demo-ref.supabase.co";
const TARGET_STORAGE_HOST = "example-ref.supabase.co";

/** Separates the fields of one report row, as `psql -F` does. */
const FIELD_SEPARATOR = "\u001f";

const CATALOG_TABLES = [
  "public.data_catalog_drives",
  "public.data_catalog_listings",
  "public.data_catalog_listings__relation_columns",
  "public.pipeline_executions",
  "public.pipeline_execution_scopes",
  "public.pipeline_scope_checkpoints",
];

/** Rows per catalog table in CATALOG_DUMP, in CATALOG_TABLES order. */
const CATALOG_DUMP_ROWS = [1, 2, 3, 1, 1, 0];

const DUMP_FOOTER = `
\\unrestrict abc123

--
-- PostgreSQL database dump complete
--
`;

const CATALOG_DUMP_BODY = `--
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

COPY public.data_catalog_listings (display_name, id, drive_id, canonical_urls) FROM stdin;
Cases\tl1\td1\t{https://data.example.org/cases.csv}
Deaths\tl2\td1\t\\N
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
`;

const CATALOG_DUMP = `${CATALOG_DUMP_BODY}${DUMP_FOOTER}`;

/** The dump with one listing linking to the source project's Storage. */
const STORAGE_DUMP = CATALOG_DUMP.replace(
  "{https://data.example.org/cases.csv}",
  `{https://data.example.org/cases.csv,https://${SOURCE_STORAGE_HOST}/storage/v1/object/public/opendata/wdi/datasets/a.parquet}`,
);

const BACKUP_TABLES = [
  ...CATALOG_TABLES,
  "public.data_catalog_facet_counts",
  "public.datasets__open_data",
];

/** The ids 1 to 6, one per line, as the fake target reports them. */
const SIX_IDS = "1\n2\n3\n4\n5\n6\n";

function _makeBackup(tables: readonly string[] = BACKUP_TABLES): string {
  const blocks = tables.map((table) => {
    return `COPY ${table} (id) FROM stdin;\n${SIX_IDS}\\.\n`;
  });
  return `--\n-- PostgreSQL database dump\n--\n${blocks.join("\n")}`;
}

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
if [[ "$1" == "--version" ]]; then
  echo "\${FAKE_PSQL_VERSION:-psql (PostgreSQL) 18.3}"
  exit 0
fi
printf '%s\\n' "$*" >> "$FAKE_LOG"
env | grep -E '^PG[A-Z]+=' >> "$FAKE_STATE/env.log"
query=""
while (($#)); do
  case "$1" in
    --file)
      cp "$2" "$FAKE_STATE/wrapper.sql"
      # A failed import rolls back, so only a successful one changes counts.
      exit_code="\${FAKE_IMPORT_EXIT:-0}"
      [[ "$exit_code" != 0 ]] || touch "$FAKE_STATE/imported"
      exit "$exit_code"
      ;;
    -c) query="$2"; shift ;;
  esac
  shift
done
case "$query" in
  *pg_constraint*) printf '%s' "\${FAKE_DEPENDENTS:-}" ;;
  *pg_attribute*) echo 1 ;;
  *"count(distinct dataset_id)"*) echo "$FAKE_ORPHANS" ;;
  *"source_type = 'open_data'"*) echo "$FAKE_ORPHANS" ;;
  "select count(*) from ("*) echo "\${FAKE_DEPENDENT_ROWS:-0}" ;;
  "select id::text from public.data_catalog_listings"*)
    printf '%s' "\${FAKE_TARGET_IDS:-}"
    ;;
  "select id::text from "*) printf '%s' "\${FAKE_DEPENDENT_IDS:-}" ;;
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
      FAKE_ORPHANS: `4${FIELD_SEPARATOR}2`,
      CATALOG_TABLES_SH: join(SCRIPTS_DIR, "catalogTables.sh"),
      ...env,
    },
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    log: _readIfPresent(join(workDir, "calls.log")),
    psqlEnv: _readIfPresent(join(workDir, "env.log")),
    wrapper: _readIfPresent(join(workDir, "wrapper.sql")),
  };
}

function _writeDump(content: string = CATALOG_DUMP): string {
  const path = join(workDir, "catalog.sql");
  writeFileSync(path, content);
  return path;
}

function _writeBackup(content: string = _makeBackup()): string {
  const path = join(workDir, "backup.sql");
  writeFileSync(path, content);
  return path;
}

function _runImport(
  extraArgs: readonly string[] = [],
  env: Record<string, string> = {},
  dump: string = CATALOG_DUMP,
) {
  return _runScript(
    "importCatalogData.sh",
    [
      TARGET_URL,
      _writeDump(dump),
      "--yes-i-know-the-target",
      TARGET_ID,
      ...extraArgs,
    ],
    env,
  );
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
      FAKE_TARGET_IDS: SIX_IDS,
      FAKE_DEPENDENT_IDS: SIX_IDS,
      FAKE_DEPENDENTS: `${OPEN_DATA_DEPENDENT}\n`,
      FAKE_DEPENDENT_ROWS: "4",
      ...env,
    },
  );
}

/** The arguments of a replace import that passes every gate. */
function _confirmedReplaceArgs(backup: string = _makeBackup()): string[] {
  return [
    "--backup-file",
    _writeBackup(backup),
    "--yes-i-know-the-target",
    TARGET_ID,
    "--yes-i-know-the-cascade",
    "4",
  ];
}

/** The wrapper lines that check every catalog table against the dump. */
function _rowCountCheckLines(): string[] {
  return [
    "do $counts$ begin",
    ...CATALOG_TABLES.flatMap((table, index) => {
      const rows = CATALOG_DUMP_ROWS[index];
      return [
        `  if (select count(*) from ${table}) <> ${rows} then`,
        `    raise exception '${table} holds % rows after the load, not the dump''s ${rows}.', (select count(*) from ${table});`,
        "  end if;",
      ];
    }),
    "end $counts$;",
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
    expect(run.log.match(/--table public\.[a-z_]+/g)).toEqual(
      CATALOG_TABLES.map((table) => {
        return `--table ${table}`;
      }),
    );
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

  it("fails when the dump holds a table outside the catalog, keeping no file", () => {
    const outFile = join(workDir, "out.sql");

    const run = _runScript(
      "exportCatalogData.sh",
      ["postgres://src", outFile],
      {
        FAKE_DUMP_EXTRA: "COPY public.workspaces (id) FROM stdin;\nw1\n\\.\n",
      },
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain("Deleted the rejected dump");
    expect(
      readdirSync(workDir).filter((name) => {
        return name.startsWith("out.sql");
      }),
    ).toEqual([]);
  });

  it("starts pg_dump with no PG* variable that could pick another host", () => {
    _writeExecutable(
      "pg_dump",
      `#!/bin/bash\nenv | grep -E '^PG[A-Z]+=' > "$FAKE_STATE/env.log"\n${FAKE_PG_DUMP.replace("#!/bin/bash\n", "")}`,
    );

    _runScript(
      "exportCatalogData.sh",
      ["postgres://src", join(workDir, "out.sql")],
      {
        PGHOSTADDR: "10.0.0.9",
        PGSERVICE: "elsewhere",
      },
    );

    expect(_readIfPresent(join(workDir, "env.log"))).not.toMatch(
      /PGHOSTADDR|PGSERVICE/,
    );
  });
});

describe("importCatalogData.sh target URL and environment", () => {
  it("starts psql with no PG* variable that could pick another host", () => {
    const run = _runImport([], {
      PGHOST: "elsewhere.example.com",
      PGHOSTADDR: "10.0.0.9",
      PGPORT: "6543",
      PGDATABASE: "other",
      PGUSER: "other",
      PGSERVICE: "elsewhere",
      PGSERVICEFILE: join(workDir, "pg_service.conf"),
      PGOPTIONS: "-c default_transaction_read_only=off",
    });

    expect(run.status).toBe(0);
    expect(run.psqlEnv).toBe("");
  });

  it.each([
    ["a percent-encoded hostaddr key", `${TARGET_URL}?h%6Fstaddr=10.0.0.9`],
    [
      "an @ inside the query string",
      `${TARGET_URL}?sslmode=require&x=@elsewhere.example.com`,
    ],
    ["a host query parameter", `${TARGET_URL}?host=elsewhere.example.com`],
    ["a service query parameter", `${TARGET_URL}?service=prod`],
    [
      "a database other than postgres",
      TARGET_URL.replace(/\/postgres$/, "/other"),
    ],
    ["an IPv6 host", "postgresql://postgres:pw@[::1]:5432/postgres"],
    [
      "several hosts",
      "postgresql://postgres:pw@a.example.com,b.example.com/postgres",
    ],
    [
      "an unencoded @ in the password",
      "postgresql://postgres:p@ss@db.example-ref.supabase.co/postgres",
    ],
  ])("refuses a target URL with %s, without connecting", (_name, url) => {
    const run = _runScript("importCatalogData.sh", [url, _writeDump()]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("the target URL must be exactly");
    expect(run.log).toBe("");
  });

  it("refuses the transaction pooler's port 6543, without connecting", () => {
    const run = _runScript("importCatalogData.sh", [
      TARGET_URL.replace(":5432", ":6543"),
      _writeDump(),
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("transaction pooler");
    expect(run.log).toBe("");
  });

  it("accepts a session pooler URL with sslmode=require", () => {
    const run = _runScript("importCatalogData.sh", [
      "postgresql://postgres.example-ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
      _writeDump(),
      "--yes-i-know-the-target",
      "postgres.example-ref@aws-0-us-east-1.pooler.supabase.com",
    ]);

    expect(run.status).toBe(0);
  });

  it.each([
    ["14.25", false],
    ["15.13", false],
    ["15.14", true],
    ["16.9", false],
    ["16.10", true],
    ["17.5", false],
    ["17.6", true],
    ["18.0", true],
  ])(
    "accepts psql %s only when it knows \\restrict: %s",
    (version, isAccepted) => {
      const run = _runImport([], {
        FAKE_PSQL_VERSION: `psql (PostgreSQL) ${version}`,
      });

      expect(run.status).toBe(isAccepted ? 0 : 1);
      if (!isAccepted) {
        expect(run.output).toContain("/opt/homebrew/opt/libpq@18/bin/psql");
      }
    },
  );
});

describe("importCatalogData.sh into an empty target", () => {
  it("runs the wrapper with ON_ERROR_STOP and without psql's --single-transaction", () => {
    const run = _runImport();

    expect(run.status).toBe(0);
    expect(run.log).toMatch(/--set ON_ERROR_STOP=1 --file \S+/);
    expect(run.log).not.toContain("--single-transaction");
  });

  it("loads a private copy of the dump, checks the rows, and refreshes the facet counts between begin and commit", () => {
    const run = _runImport();

    expect(run.wrapper.trim().split("\n")).toEqual([
      "\\set ON_ERROR_STOP on",
      "\\pset tuples_only on",
      "\\pset format unaligned",
      "begin;",
      "set local lock_timeout = '10s';",
      expect.stringMatching(/^\\i '\/.+\/catalog\.sql'$/),
      "set local lock_timeout = '10s';",
      ..._rowCountCheckLines(),
      "select public.data_catalog_facet_counts__refresh();",
      "commit;",
    ]);
    expect(run.wrapper).not.toContain(`'${join(workDir, "catalog.sql")}'`);
  });

  it("prints each table's row count in the target after the import", () => {
    const run = _runImport();

    expect(run.output).toMatch(/After the import[\s\S]*listings: 2/);
  });

  it("reports that the failed import rolled back when the counts did not change", () => {
    const run = _runImport([], { FAKE_IMPORT_EXIT: "3" });

    expect(run.status).toBe(1);
    expect(run.output).toContain("its transaction rolled back");
  });

  it("refuses a target whose catalog tables have rows, without loading the dump", () => {
    const run = _runImport([], { FAKE_TARGET_ROWS: "6" });

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
    expect(run.output).toContain(`but the target is ${TARGET_ID}`);
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

  it("never prints the target's password", () => {
    const run = _runImport();

    expect(run.output).toContain(TARGET_ID);
    expect(run.output).not.toContain("s3cret-pass");
  });
});

describe("importCatalogData.sh dump checks", () => {
  it.each([
    ["an empty file", ""],
    [
      "a dump cut inside its last rows block",
      CATALOG_DUMP_BODY.slice(0, CATALOG_DUMP_BODY.lastIndexOf("\\.")),
    ],
    ["a dump without the completion footer", CATALOG_DUMP_BODY],
    [
      "a \\restrict without its \\unrestrict",
      `${CATALOG_DUMP_BODY}\n--\n-- PostgreSQL database dump complete\n--\n`,
    ],
  ])("refuses %s, without connecting", (_name, dump) => {
    const run = _runImport([], {}, dump);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
  });

  it("names a rows block with no closing \\. as cut short", () => {
    const run = _runImport(
      [],
      {},
      CATALOG_DUMP_BODY.slice(0, CATALOG_DUMP_BODY.lastIndexOf("\\.")),
    );

    expect(run.output).toContain(
      "public.pipeline_scope_checkpoints has no closing",
    );
  });

  it.each([
    [
      "DROP TABLE public.workspaces;",
      `${CATALOG_DUMP}DROP TABLE public.workspaces;\n`,
    ],
    [
      "session_replication_role",
      CATALOG_DUMP.replace(
        "SET statement_timeout = 0;",
        "SET session_replication_role = replica;",
      ),
    ],
    [
      "COPY public.data_catalog_facet_counts",
      CATALOG_DUMP.replace(
        "\\unrestrict",
        "COPY public.data_catalog_facet_counts (id) FROM stdin;\n1\n\\.\n\\unrestrict",
      ),
    ],
  ])("refuses a dump holding %s, without connecting", (line, dump) => {
    const run = _runImport([], {}, dump);

    expect(run.status).toBe(1);
    expect(run.output).toContain(line);
    expect(run.log).toBe("");
  });
});

describe("importCatalogData.sh Storage URLs", () => {
  it("prints the Storage hosts the dump's listings link to on a dry run", () => {
    const run = _runImport(["--dry-run"], {}, STORAGE_DUMP);

    expect(run.status).toBe(0);
    expect(run.output).toContain(`  ${SOURCE_STORAGE_HOST}: 1 listings`);
  });

  it("refuses a dump that links to Storage without --rewrite-storage-host", () => {
    const run = _runImport([], {}, STORAGE_DUMP);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      `link to Storage on ${SOURCE_STORAGE_HOST}. Pass --rewrite-storage-host`,
    );
    expect(run.log).not.toContain("--file");
  });

  it("rewrites the source Storage host after the load and refuses to commit while it remains", () => {
    const run = _runImport(
      ["--rewrite-storage-host", SOURCE_STORAGE_HOST, TARGET_STORAGE_HOST],
      {},
      STORAGE_DUMP,
    );

    expect(run.status).toBe(0);
    const lines = run.wrapper.split("\n");
    const loadLine = lines.findIndex((line) => {
      return line.startsWith("\\i ");
    });
    const rewriteLine = lines.findIndex((line) => {
      return line.includes(
        `replace(item.url, 'https://${SOURCE_STORAGE_HOST}/storage/v1/', 'https://${TARGET_STORAGE_HOST}/storage/v1/')`,
      );
    });
    const guardLine = lines.findIndex((line) => {
      return line.includes(`like '%${SOURCE_STORAGE_HOST}%'`);
    });
    expect(loadLine).toBeGreaterThan(0);
    expect(rewriteLine).toBeGreaterThan(loadLine);
    expect(guardLine).toBeGreaterThan(rewriteLine);
    expect(lines.indexOf("commit;")).toBeGreaterThan(guardLine);
  });

  it("refuses a rewrite to a host that is not the target project's Storage", () => {
    const run = _runImport(
      ["--rewrite-storage-host", SOURCE_STORAGE_HOST, "other-ref.supabase.co"],
      {},
      STORAGE_DUMP,
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      `but the target's Storage is ${TARGET_STORAGE_HOST}`,
    );
    expect(run.log).toBe("");
  });

  it("refuses a dump that also links to a Storage host the rewrite does not name", () => {
    const run = _runImport(
      ["--rewrite-storage-host", "third-ref.supabase.co", TARGET_STORAGE_HOST],
      {},
      STORAGE_DUMP,
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      `also link to Storage on ${SOURCE_STORAGE_HOST}`,
    );
  });
});

describe("importCatalogData.sh --replace-existing", () => {
  it("rechecks the cascade, deletes children first, loads, and refreshes between begin and commit", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.status).toBe(0);
    expect(run.wrapper.trim().split("\n")).toEqual([
      "\\set ON_ERROR_STOP on",
      "\\pset tuples_only on",
      "\\pset format unaligned",
      "begin;",
      "set local lock_timeout = '10s';",
      "lock table public.pipeline_scope_checkpoints, public.pipeline_execution_scopes, public.pipeline_executions, public.data_catalog_listings__relation_columns, public.data_catalog_listings, public.data_catalog_drives, public.datasets__open_data in share row exclusive mode;",
      "do $check$ begin",
      expect.stringMatching(
        /^ {2}if \(0 \+ \(select count\(\*\) from \(select \* from public\.datasets__open_data .+\) as affected\)\) <> 4 then$/,
      ),
      expect.stringMatching(
        /^ {4}raise exception 'The delete now reaches % dependent rows, not the 4 confirmed\.'/,
      ),
      "  end if;",
      "end $check$;",
      "delete from public.pipeline_scope_checkpoints;",
      "delete from public.pipeline_execution_scopes;",
      "delete from public.pipeline_executions;",
      "delete from public.data_catalog_listings__relation_columns;",
      "delete from public.data_catalog_listings;",
      "delete from public.data_catalog_drives;",
      expect.stringMatching(/^\\i '\/.+\/catalog\.sql'$/),
      "set local lock_timeout = '10s';",
      ..._rowCountCheckLines(),
      "select public.data_catalog_facet_counts__refresh();",
      "commit;",
    ]);
  });

  it("reports each dependent table and the rows the cascade deletes", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toMatch(
      /public\.datasets__open_data\.\(catalog_listing_id\) -> public\.data_catalog_listings: on delete cascade, 4 rows deleted/,
    );
  });

  it("says which users' datasets the cascade orphans, in the report, the plan, and the final output", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    const orphanLines = run.output.split("\n").filter((line) => {
      return line.includes("4 public.datasets rows in 2 workspaces");
    });
    expect(orphanLines).toHaveLength(3);
    expect(run.output).toContain(
      "Open data datasets with no open data details now: 4 public.datasets rows in 2 workspaces.",
    );
  });

  it("stops when the orphaned-dataset count cannot be read", () => {
    const run = _runReplace(_confirmedReplaceArgs(), { FAKE_ORPHANS: "" });

    expect(run.status).toBe(1);
    expect(run.output).toContain("could not count the datasets");
    expect(run.log).not.toContain("--file");
  });

  it("reports the target's listing ids the dump does not hold", () => {
    const run = _runReplace(["--dry-run"], {
      FAKE_TARGET_IDS: "l1\nold-1\nold-2\n",
    });

    expect(run.output).toMatch(
      /2 listing ids in the target are not in the dump[\s\S]*old-1[\s\S]*old-2/,
    );
  });

  it("refuses without a backup file and prints a pg_dump command naming the target", () => {
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
    expect(run.output).toContain("--table 'public.datasets__open_data'");
    expect(run.output).toContain(
      "--file 'catalog-backup-db.example-ref.supabase.co-",
    );
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
  });

  it("refuses a backup that lacks a dependent table", () => {
    const run = _runReplace(
      _confirmedReplaceArgs(_makeBackup(BACKUP_TABLES.slice(0, -1))),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "has no rows block for public.datasets__open_data",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses a backup that holds a table the import does not touch", () => {
    const run = _runReplace(
      _confirmedReplaceArgs(
        _makeBackup([...BACKUP_TABLES, "public.workspaces"]),
      ),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain("also holds public.workspaces");
  });

  it("refuses a backup whose row counts differ from the target's", () => {
    const run = _runReplace(_confirmedReplaceArgs(), { FAKE_TARGET_ROWS: "7" });

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "holds 6 rows of public.data_catalog_drives, but the target holds 7",
    );
  });

  it("refuses a backup whose ids differ from the target's", () => {
    const run = _runReplace(_confirmedReplaceArgs(), {
      FAKE_DEPENDENT_IDS: "1\n2\n3\n4\n5\n7\n",
    });

    expect(run.status).toBe(1);
    expect(run.output).toContain("holds other public.data_catalog_drives ids");
    expect(run.log).not.toContain("--file");
  });

  it("prints how to restore the backup before it imports", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toMatch(
      /To restore the backup later:[\s\S]*SET transaction_timeout = 0;[\s\S]*begin;[\s\S]*delete from public\.data_catalog_facet_counts;[\s\S]*commit;/,
    );
  });

  it("refuses a cascade confirmation with another row count", () => {
    const run = _runReplace([
      ..._confirmedReplaceArgs().slice(0, 4),
      "--yes-i-know-the-cascade",
      "3",
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "--yes-i-know-the-cascade says 3, but it must be 4",
    );
  });

  it("refuses without the cascade confirmation when there is no terminal", () => {
    const run = _runReplace(_confirmedReplaceArgs().slice(0, 4));

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "no terminal to confirm on. Pass --yes-i-know-the-cascade 4",
    );
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
    expect(run.log).not.toContain("--file");
  });

  it("writes nothing on --dry-run and exits 0", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.status).toBe(0);
    expect(run.output).toContain("Dry run");
    expect(run.log).not.toContain("--file");
  });
});
