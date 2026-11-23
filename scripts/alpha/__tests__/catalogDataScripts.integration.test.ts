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
const SOURCE_URL =
  "postgresql://postgres.demo-ref:src-s3cret@pooler.example.com:5432/postgres";
const SOURCE_STORAGE_HOST = "demo-ref.supabase.co";
const TARGET_STORAGE_HOST = "example-ref.supabase.co";

/**
 * Each run starts many fake `psql` processes, so a replace run can take a
 * few seconds on a busy machine.
 */
const SHELL_TEST_OPTIONS = { timeout: 20_000 };

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

COPY public.pipeline_executions (id, pipeline_name, cli_argv, actor, host) FROM stdin;
e1\tsocrata\t{run,--all}\tdeveloper@laptop.local\tlaptop.local
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
  "public.datasets",
];

/**
 * The open data datasets a replace deletes, as the guard query prints them:
 * dataset id, name, workspace id, name, member count, members without an
 * @avandarlabs.com email, and the @avandarlabs.com emails.
 */
function _openDataDatasetRow(
  datasetId: string,
  workspaceId: string,
  memberCount: number,
  otherMemberCount: number,
): string {
  return [
    datasetId,
    "World Development Indicators (WDI)",
    workspaceId,
    `Workspace ${workspaceId}`,
    String(memberCount),
    String(otherMemberCount),
    memberCount > otherMemberCount ? "pablo@avandarlabs.com" : "",
  ].join(FIELD_SEPARATOR);
}

/** 4 open data datasets in 2 workspaces whose only member is Avandar's. */
const AVANDAR_OPEN_DATA_DATASETS = [
  _openDataDatasetRow("ds1", "ws1", 1, 0),
  _openDataDatasetRow("ds2", "ws1", 1, 0),
  _openDataDatasetRow("ds3", "ws2", 1, 0),
  _openDataDatasetRow("ds4", "ws2", 1, 0),
].join("\n");

/** The cascade total: 4 `datasets__open_data` rows and 4 datasets. */
const CASCADE_ROWS = "8";

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
      while IFS= read -r line; do
        if [[ "$line" == "\\\\i '"*"'" ]]; then
          loaded="\${line#"\\\\i '"}"
          cp "\${loaded%"'"}" "$FAKE_STATE/loaded.sql"
        fi
      done < "$2"
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
  *"avandarlabs.com"*) printf '%s' "\${FAKE_OPEN_DATA_DATASETS:-}" ;;
  *pg_attribute*) echo 1 ;;
  *"count(distinct dataset.id)"*) echo "$FAKE_ORPHANS" ;;
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
      TARGET_DB_URL: TARGET_URL,
      SOURCE_DB_URL: SOURCE_URL,
      ...env,
    },
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    log: _readIfPresent(join(workDir, "calls.log")),
    psqlEnv: _readIfPresent(join(workDir, "env.log")),
    wrapper: _readIfPresent(join(workDir, "wrapper.sql")),
    loaded: _readIfPresent(join(workDir, "loaded.sql")),
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
      _writeDump(dump),
      "--yes-i-know-the-target",
      TARGET_ID,
      ...extraArgs,
    ],
    env,
  );
}

/** Imports the Storage-linked dump with a rewrite to the target's Storage. */
function _runStorageRewrite() {
  return _runImport(
    ["--rewrite-storage-host", SOURCE_STORAGE_HOST, TARGET_STORAGE_HOST],
    {},
    STORAGE_DUMP,
  );
}

/** Runs a replace import of the standard dump with these extra arguments. */
function _runReplace(
  extraArgs: readonly string[],
  env: Record<string, string> = {},
) {
  return _runScript(
    "importCatalogData.sh",
    [_writeDump(), "--replace-existing", ...extraArgs],
    {
      FAKE_TARGET_ROWS: "6",
      FAKE_TARGET_IDS: SIX_IDS,
      FAKE_DEPENDENT_IDS: SIX_IDS,
      FAKE_DEPENDENTS: `${OPEN_DATA_DEPENDENT}\n`,
      FAKE_DEPENDENT_ROWS: "4",
      FAKE_OPEN_DATA_DATASETS: `${AVANDAR_OPEN_DATA_DATASETS}\n`,
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
    CASCADE_ROWS,
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

/** The wrapper lines that refuse to commit a developer's command line. */
const REDACTION_CHECK_LINES = [
  "do $redacted$ begin",
  "  if exists (select 1 from public.pipeline_executions where cli_argv is not null or actor is not null or host is not null) then",
  "    raise exception 'public.pipeline_executions still holds a command line, actor, or host after the load.';",
  "  end if;",
  "end $redacted$;",
];

/** The statement that deletes every dataset added from the catalog. */
const OPEN_DATA_DATASETS_DELETE =
  "delete from public.datasets where id in (select dataset_id from public.datasets__open_data where catalog_listing_id in (select id from public.data_catalog_listings));";

/** The wrapper's lines without the multi-line guard block. */
function _linesWithoutGuard(wrapper: string): string[] {
  const lines = wrapper.trim().split("\n");
  const start = lines.indexOf("do $guard$");
  const end = lines.indexOf("end $guard$;");
  if (start === -1) {
    return lines;
  }
  return [...lines.slice(0, start), ...lines.slice(end + 1)];
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "catalog-data-scripts-"));
  _writeExecutable("pg_dump", FAKE_PG_DUMP);
  _writeExecutable("psql", FAKE_PSQL);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("exportCatalogData.sh", SHELL_TEST_OPTIONS, () => {
  it("dumps data only, without disabling triggers", () => {
    const run = _runScript("exportCatalogData.sh", [join(workDir, "out.sql")]);

    expect(run.log).toMatch(/--data-only/);
    expect(run.log).not.toContain("--disable-triggers");
  });

  it("dumps exactly the catalog tables", () => {
    const outFile = join(workDir, "out.sql");

    const run = _runScript("exportCatalogData.sh", [outFile]);

    expect(run.log.match(/--table public\.[a-z_]+/g)).toEqual(
      CATALOG_TABLES.map((table) => {
        return `--table ${table}`;
      }),
    );
  });

  it("prints each table's row count from the dump", () => {
    const run = _runScript("exportCatalogData.sh", [join(workDir, "out.sql")]);

    expect(run.output).toContain("public.data_catalog_listings: 2");
    expect(run.output).toContain(
      "public.data_catalog_listings__relation_columns: 3",
    );
    expect(run.output).toContain("public.pipeline_scope_checkpoints: 0");
  });

  it("drops the transaction_timeout setting that Postgres before 17 rejects", () => {
    const outFile = join(workDir, "out.sql");

    _runScript("exportCatalogData.sh", [outFile]);

    const dump = readFileSync(outFile, "utf8");
    expect(dump).toContain("SET statement_timeout = 0;");
    expect(dump).not.toContain("transaction_timeout");
  });

  it("refuses to overwrite an existing file without calling pg_dump", () => {
    const outFile = _writeDump("keep me");

    const run = _runScript("exportCatalogData.sh", [outFile]);

    expect(run.status).toBe(1);
    expect(run.log).toBe("");
    expect(readFileSync(outFile, "utf8")).toBe("keep me");
  });

  it("fails when the dump holds a table outside the catalog", () => {
    const run = _runScript(
      "exportCatalogData.sh",
      [join(workDir, "out.sql")],
      {
        FAKE_DUMP_EXTRA: "COPY public.workspaces (id) FROM stdin;\nw1\n\\.\n",
      },
    );

    expect(run.status).toBe(1);
  });

  it("deletes a rejected dump, leaving no output file", () => {
    const run = _runScript(
      "exportCatalogData.sh",
      [join(workDir, "out.sql")],
      {
        FAKE_DUMP_EXTRA: "COPY public.workspaces (id) FROM stdin;\nw1\n\\.\n",
      },
    );

    expect(run.output).toContain("Deleted the rejected dump");
    expect(
      readdirSync(workDir).filter((name) => {
        return name.startsWith("out.sql");
      }),
    ).toEqual([]);
  });

  it("refuses a source URL passed as an argument, without calling pg_dump or printing it", () => {
    const run = _runScript("exportCatalogData.sh", [
      SOURCE_URL,
      join(workDir, "out.sql"),
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("Pass the source URL in SOURCE_DB_URL");
    expect(run.output).not.toContain("src-s3cret");
    expect(run.log).toBe("");
  });

  it("refuses when SOURCE_DB_URL is not set, without calling pg_dump", () => {
    const run = _runScript("exportCatalogData.sh", [join(workDir, "out.sql")], {
      SOURCE_DB_URL: "",
    });

    expect(run.status).toBe(1);
    expect(run.output).toContain("SOURCE_DB_URL is not set");
    expect(run.log).toBe("");
  });

  it("passes the source password in PGPASSWORD, never on pg_dump's command line", () => {
    _writeExecutable(
      "pg_dump",
      `#!/bin/bash\nenv | grep -E '^PG[A-Z]+=' > "$FAKE_STATE/env.log"\n${FAKE_PG_DUMP.replace("#!/bin/bash\n", "")}`,
    );

    const run = _runScript("exportCatalogData.sh", [join(workDir, "out.sql")], {
      SOURCE_DB_URL:
        "postgresql://postgres.demo-ref:p%40ss-word@pooler.example.com:5432/postgres",
    });

    expect(run.status).toBe(0);
    expect(run.log).not.toContain("p%40ss-word");
    expect(run.log).toContain(
      "postgresql://postgres.demo-ref@pooler.example.com:5432/postgres --data-only",
    );
    expect(_readIfPresent(join(workDir, "env.log"))).toBe(
      "PGPASSWORD=p@ss-word\n",
    );
  });

  it("starts pg_dump with no PG* variable that could pick another host", () => {
    _writeExecutable(
      "pg_dump",
      `#!/bin/bash\nenv | grep -E '^PG[A-Z]+=' > "$FAKE_STATE/env.log"\n${FAKE_PG_DUMP.replace("#!/bin/bash\n", "")}`,
    );

    _runScript(
      "exportCatalogData.sh",
      [join(workDir, "out.sql")],
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

describe(
  "importCatalogData.sh target URL and environment",
  SHELL_TEST_OPTIONS,
  () => {
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
      expect(
        run.psqlEnv.split("\n").filter((line) => {
          return line !== "" && !line.startsWith("PGPASSWORD=");
        }),
      ).toEqual([]);
    });

    it("refuses a target URL passed as an argument, without connecting or printing it", () => {
      const run = _runScript("importCatalogData.sh", [
        TARGET_URL,
        _writeDump(),
        "--yes-i-know-the-target",
        TARGET_ID,
      ]);

      expect(run.status).toBe(1);
      expect(run.output).toContain("Pass the target URL in TARGET_DB_URL");
      expect(run.output).not.toContain("s3cret-pass");
      expect(run.log).toBe("");
    });

    it("refuses when TARGET_DB_URL is not set, without connecting", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [_writeDump(), "--yes-i-know-the-target", TARGET_ID],
        { TARGET_DB_URL: "" },
      );

      expect(run.status).toBe(1);
      expect(run.output).toContain("TARGET_DB_URL is not set");
      expect(run.log).toBe("");
    });

    it("starts no process with the password in its arguments on a replace", () => {
      const run = _runReplace(_confirmedReplaceArgs());

      expect(run.status).toBe(0);
      expect(run.log).not.toContain("s3cret");
      expect(run.output).not.toContain("s3cret");
    });

    it("passes the password in PGPASSWORD, never on psql's command line", () => {
      const run = _runImport();

      expect(run.status).toBe(0);
      expect(run.log).not.toContain("s3cret-pass");
      expect(run.log).toContain(
        "postgresql://postgres@db.example-ref.supabase.co:5432/postgres -X",
      );
      expect(run.psqlEnv.split("\n")).toContain("PGPASSWORD=s3cret-pass");
    });

    it("percent-decodes the password it passes in PGPASSWORD", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        "--yes-i-know-the-target",
        TARGET_ID,
        ],
        { TARGET_DB_URL: TARGET_URL.replace("s3cret-pass", "s3cret%40pass%2Fx") },
      );

      expect(run.status).toBe(0);
      expect(run.log).not.toContain("s3cret");
      expect(run.psqlEnv.split("\n")).toContain("PGPASSWORD=s3cret@pass/x");
    });

    it("refuses a password with an invalid percent-encoding, without connecting", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        ],
        { TARGET_DB_URL: TARGET_URL.replace("s3cret-pass", "s3cret%zzpass") },
      );

      expect(run.status).toBe(1);
      expect(run.output).toContain("invalid percent-encoding");
      expect(run.output).not.toContain("s3cret");
      expect(run.log).toBe("");
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
      const run = _runScript("importCatalogData.sh", [_writeDump()], {
        TARGET_DB_URL: url,
      });

      expect(run.status).toBe(1);
      expect(run.output).toContain("the target URL must be exactly");
      expect(run.log).toBe("");
    });

    it("refuses a connect_timeout query, saying how to strip it, without connecting", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        ],
        { TARGET_DB_URL: `${TARGET_URL}?connect_timeout=10` },
      );

      expect(run.status).toBe(1);
      expect(run.output).toContain('TARGET_DB_URL="${TARGET_DB_URL%%\\?*}"');
      expect(run.log).toBe("");
    });

    it("refuses the transaction pooler's port 6543, without connecting", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        ],
        { TARGET_DB_URL: TARGET_URL.replace(":5432", ":6543") },
      );

      expect(run.status).toBe(1);
      expect(run.output).toContain("transaction pooler");
      expect(run.log).toBe("");
    });

    it("accepts a session pooler URL with sslmode=require", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        "--yes-i-know-the-target",
        "postgres.example-ref@aws-0-us-east-1.pooler.supabase.com",
        ],
        { TARGET_DB_URL: "postgresql://postgres.example-ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" },
      );

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
  },
);

describe(
  "importCatalogData.sh into an empty target",
  SHELL_TEST_OPTIONS,
  () => {
    it("runs the wrapper with ON_ERROR_STOP", () => {
      const run = _runImport();

      expect(run.log).toMatch(/--set ON_ERROR_STOP=1 --file \S+/);
    });

    it("leaves the transaction to the wrapper, not psql's --single-transaction", () => {
      const run = _runImport();

      expect(run.log).not.toContain("--single-transaction");
    });

    it("turns the pager off on every psql call, so none can hold the transaction open", () => {
      const run = _runImport();

      const calls = run.log.split("\n").filter((line) => {
        return line.startsWith("postgresql://");
      });
      expect(calls.length).toBeGreaterThan(0);
      expect(
        calls.filter((line) => {
          return !line.includes("-X -P pager=off");
        }),
      ).toEqual([]);
    });

    it("writes a wrapper that runs every import step between begin and commit", () => {
      const run = _runImport();

      expect(run.wrapper.trim().split("\n")).toEqual([
        "\\set ON_ERROR_STOP on",
        "\\pset tuples_only on",
        "\\pset format unaligned",
        "begin;",
        "set local lock_timeout = '10s';",
        expect.stringMatching(/^\\i '\/.+\/catalog\.sql'$/),
        "set local lock_timeout = '10s';",
        ...REDACTION_CHECK_LINES,
        ..._rowCountCheckLines(),
        "select public.data_catalog_facet_counts__refresh();",
        "commit;",
      ]);
    });

    it("loads pipeline executions with no command line or actor", () => {
      const run = _runImport();

      expect(run.status).toBe(0);
      expect(run.loaded).toContain(
        "COPY public.pipeline_executions (id, pipeline_name, cli_argv, actor, host) FROM stdin;\ne1\tsocrata\t\\N\t\\N\t\\N\n\\.",
      );
      expect(run.loaded).not.toContain("laptop.local");
    });

    it("loads a private copy of the dump, not the file it was given", () => {
      const run = _runImport();

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
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        "--yes-i-know-the-target",
        "postgres@db.other-ref.supabase.co",
        ],
        { TARGET_DB_URL: TARGET_URL },
      );

      expect(run.status).toBe(1);
      expect(run.output).toContain(`but the target is ${TARGET_ID}`);
      expect(run.log).toBe("");
    });

    it("refuses without a confirmation when there is no terminal to ask on", () => {
      const run = _runScript(
        "importCatalogData.sh",
        [
        _writeDump(),
        ],
        { TARGET_DB_URL: TARGET_URL },
      );

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
  },
);

describe("importCatalogData.sh dump checks", SHELL_TEST_OPTIONS, () => {
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

describe("importCatalogData.sh Storage URLs", SHELL_TEST_OPTIONS, () => {
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

  it("rewrites the source Storage host after the load", () => {
    const lines = _runStorageRewrite().wrapper.split("\n");

    const loadLine = lines.findIndex((line) => {
      return line.startsWith("\\i ");
    });
    const rewriteLine = lines.findIndex((line) => {
      return line.includes(
        `replace(item.url, 'https://${SOURCE_STORAGE_HOST}/storage/v1/', 'https://${TARGET_STORAGE_HOST}/storage/v1/')`,
      );
    });
    expect(loadLine).toBeGreaterThan(0);
    expect(rewriteLine).toBeGreaterThan(loadLine);
  });

  it("checks that no listing still mentions the source host before commit", () => {
    const lines = _runStorageRewrite().wrapper.split("\n");

    const rewriteLine = lines.findIndex((line) => {
      return line.includes(`'https://${SOURCE_STORAGE_HOST}/storage/v1/'`);
    });
    const guardLine = lines.findIndex((line) => {
      return line.includes(`like '%${SOURCE_STORAGE_HOST}%'`);
    });
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

describe("importCatalogData.sh --replace-existing", SHELL_TEST_OPTIONS, () => {
  it("writes a replace wrapper that runs every step between begin and commit", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.status).toBe(0);
    expect(_linesWithoutGuard(run.wrapper)).toEqual([
      "\\set ON_ERROR_STOP on",
      "\\pset tuples_only on",
      "\\pset format unaligned",
      "begin;",
      "set local lock_timeout = '10s';",
      "lock table public.pipeline_scope_checkpoints, public.pipeline_execution_scopes, public.pipeline_executions, public.data_catalog_listings__relation_columns, public.data_catalog_listings, public.data_catalog_drives, public.datasets__open_data, public.datasets in share row exclusive mode;",
      "do $check$ begin",
      expect.stringMatching(
        /^ {2}if \(0 \+ \(select count\(\*\) from \(select \* from public\.datasets__open_data .+\) as affected\) \+ \(select count\(\*\) from \(select \* from public\.datasets where .+\) as affected\)\) <> 8 then$/,
      ),
      expect.stringMatching(
        /^ {4}raise exception 'The delete now reaches % dependent rows, not the 8 confirmed\.'/,
      ),
      "  end if;",
      "end $check$;",
      "lock table public.workspace_memberships in share mode;",
      OPEN_DATA_DATASETS_DELETE,
      "delete from public.pipeline_scope_checkpoints;",
      "delete from public.pipeline_execution_scopes;",
      "delete from public.pipeline_executions;",
      "delete from public.data_catalog_listings__relation_columns;",
      "delete from public.data_catalog_listings;",
      "delete from public.data_catalog_drives;",
      expect.stringMatching(/^\\i '\/.+\/catalog\.sql'$/),
      "set local lock_timeout = '10s';",
      ...REDACTION_CHECK_LINES,
      ..._rowCountCheckLines(),
      "select public.data_catalog_facet_counts__refresh();",
      "commit;",
    ]);
  });

  it("checks the @avandarlabs.com guard after the cascade check and before deleting the datasets", () => {
    const lines = _runReplace(_confirmedReplaceArgs()).wrapper.split("\n");

    const checkEnd = lines.indexOf("end $check$;");
    const guardStart = lines.indexOf("do $guard$");
    const guardEnd = lines.indexOf("end $guard$;");
    const datasetDelete = lines.indexOf(OPEN_DATA_DATASETS_DELETE);
    expect(guardStart).toBeGreaterThan(checkEnd);
    expect(datasetDelete).toBeGreaterThan(guardEnd);
    expect(lines.indexOf("delete from public.data_catalog_listings;")).toBeGreaterThan(
      datasetDelete,
    );
    const guard = lines.slice(guardStart, guardEnd + 1).join("\n");
    expect(guard).toContain("member_count = 0 or other_member_count > 0");
    expect(guard).toMatch(
      /perform 1 from auth\.users where id in \(select user_id from public\.workspace_memberships where workspace_id in \(.+\)\) for share;/,
    );
    expect(guard.indexOf("for share;")).toBeLessThan(
      guard.indexOf("select * into blocked"),
    );
    expect(guard).toContain("like '%@avandarlabs.com'");
    expect(guard).toMatch(
      /raise exception 'Refusing to delete open data dataset % in workspace %: % of its % members have no @avandarlabs\.com email\.'/,
    );
  });

  it("lists each open data dataset, its workspace, its members, and the guard on a dry run", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.status).toBe(0);
    expect(run.output).toContain(
      'dataset ds1 "World Development Indicators (WDI)" in workspace ws1 "Workspace ws1"',
    );
    expect(run.output).toContain(
      "members: pablo@avandarlabs.com (1 of 1 have an @avandarlabs.com email), guard passes",
    );
    expect(run.output).toContain(
      "The @avandarlabs.com guard passes for all 4 open data datasets.",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses a replace when a workspace has a member outside @avandarlabs.com, naming counts, not emails", () => {
    const run = _runReplace(_confirmedReplaceArgs(), {
      FAKE_OPEN_DATA_DATASETS: `${AVANDAR_OPEN_DATA_DATASETS}\n${_openDataDatasetRow("ds5", "ws3", 3, 2)}\n`,
    });

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "open data dataset ds5 in workspace ws3 has 2 of its 3 members without an @avandarlabs.com email",
    );
    expect(run.log).not.toContain("--file");
  });

  it("refuses a replace when a workspace has no members", () => {
    const run = _runReplace(_confirmedReplaceArgs(), {
      FAKE_OPEN_DATA_DATASETS: `${_openDataDatasetRow("ds5", "ws3", 0, 0)}\n`,
    });

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "open data dataset ds5 in workspace ws3 has no members",
    );
    expect(run.log).not.toContain("--file");
  });

  it("says on a dry run that the guard would refuse, and writes nothing", () => {
    const run = _runReplace(["--dry-run"], {
      FAKE_OPEN_DATA_DATASETS: `${_openDataDatasetRow("ds5", "ws3", 3, 2)}\n`,
    });

    expect(run.status).toBe(0);
    expect(run.output).toContain("guard fails");
    expect(run.output).toMatch(/The import would refuse: open data dataset ds5/);
    expect(run.log).not.toContain("--file");
  });

  it("prints the pg_dump backup command on a replace dry run", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.output).toContain("--table 'public.datasets'");
    expect(run.output).toContain("--table 'public.datasets__open_data'");
  });

  it("prints restore steps that stage the backup and keep rows the target still has", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toContain(
      "create table catalog_restore.datasets (like public.datasets);",
    );
    expect(run.output).toContain(
      "insert into public.datasets (id) overriding system value select id from catalog_restore.datasets on conflict do nothing;",
    );
    expect(run.output.indexOf("into public.datasets (id)")).toBeLessThan(
      run.output.indexOf("into public.datasets__open_data (id)"),
    );
  });

  it("reports each dependent table and the rows the cascade deletes", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toMatch(
      /public\.datasets__open_data\.\(catalog_listing_id\) -> public\.data_catalog_listings: on delete cascade, 4 rows deleted/,
    );
  });

  it("counts the open data datasets it deletes in the report and the plan", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toContain(
      "  public.datasets: 4 rows deleted, every dataset added from the catalog, in 2 workspaces",
    );
    expect(run.output).toMatch(
      /delete the 4 public\.datasets rows in 2 workspaces added from the catalog/,
    );
    expect(run.output).toContain("delete or change 8 dependent rows");
  });

  it("counts the orphaned datasets again after the import", () => {
    const run = _runReplace(_confirmedReplaceArgs());

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

  it("refuses a replace without a backup file", () => {
    const run = _runReplace(_confirmedReplaceArgs().slice(2));

    expect(run.status).toBe(1);
    expect(run.output).toContain("--replace-existing needs --backup-file");
    expect(run.log).not.toContain("--file");
  });

  it("prints a pg_dump command that backs up every table the replace touches", () => {
    const run = _runReplace(_confirmedReplaceArgs().slice(2));

    expect(run.output).toContain(
      'with_db_url "$TARGET_DB_URL" pg_dump --data-only --no-owner --no-privileges',
    );
    expect(run.output).toContain("--table 'public.datasets__open_data'");
  });

  it("names the suggested backup file after the target host", () => {
    const run = _runReplace(_confirmedReplaceArgs().slice(2));

    expect(run.output).toContain(
      "--file 'catalog-backup-db.example-ref.supabase.co-",
    );
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
      CASCADE_ROWS,
    ]);

    expect(run.status).toBe(1);
    expect(run.output).toContain("is older than 24 hours");
  });

  it("refuses a backup that lacks a dependent table", () => {
    const run = _runReplace(
      _confirmedReplaceArgs(_makeBackup(BACKUP_TABLES.slice(0, -1))),
    );

    expect(run.status).toBe(1);
    expect(run.output).toContain("has no rows block for public.datasets");
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

  it("names the psql releases that know \\restrict in the restore steps", () => {
    const run = _runReplace(_confirmedReplaceArgs());

    expect(run.output).toContain(
      "3. Run it with psql 15.14+, 16.10+, 17.6+, or 18+: with_db_url \"$TARGET_DB_URL\" psql -X",
    );
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
      "--yes-i-know-the-cascade says 3, but it must be 8",
    );
  });

  it("refuses without the cascade confirmation when there is no terminal", () => {
    const run = _runReplace(_confirmedReplaceArgs().slice(0, 4));

    expect(run.status).toBe(1);
    expect(run.output).toContain(
      "no terminal to confirm on. Pass --yes-i-know-the-cascade 8",
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

  it("exits 0 on --dry-run", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.status).toBe(0);
  });

  it("writes nothing on --dry-run", () => {
    const run = _runReplace(["--dry-run"]);

    expect(run.output).toContain("Dry run: nothing was written.");
    expect(run.log).not.toContain("--file");
  });
});
