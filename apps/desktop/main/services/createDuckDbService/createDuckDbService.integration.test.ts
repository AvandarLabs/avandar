import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDuckDbService } from "./createDuckDbService";

/*
 * G2.12 — Native DuckDB happy path + parity. Runs against the real `duckdb`
 * Node binding loaded under Bun (the same one `@avandar/etl` uses). The
 * golden cases pin the column-type names so BIGINT/INTEGER and TIMESTAMP_NS
 * drift between native DuckDB and the legacy duckdb-wasm path is caught here
 * rather than in a downstream UI assertion.
 */

describe("DuckDb service", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "avandar-duckdb-test-"));
  });

  afterEach(async () => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("opens a database file and runs SELECT 1", async () => {
    const svc = createDuckDbService(join(dir, "ava.duckdb"));
    try {
      const rows = await svc.runRawQuery<{ one: number }>(
        "select 1 as one",
        [],
      );
      expect(rows.length).toBe(1);
      expect(rows[0]!.one).toBe(1);
    } finally {
      await svc.close();
    }
  });

  it("round-trips a parquet file written and read via DuckDB", async () => {
    const svc = createDuckDbService(join(dir, "ava.duckdb"));
    try {
      const parquetPath = join(dir, "sample.parquet");
      await svc.runRawQuery(
        `copy (select 1 as id, 'a' as name union all select 2, 'b')
         to '${parquetPath}' (format parquet)`,
        [],
      );

      const rows = await svc.runRawQuery<{ id: number; name: string }>(
        `select id, name from read_parquet('${parquetPath}') order by id`,
        [],
      );
      expect(rows.length).toBe(2);
      expect(rows[0]!.id).toBe(1);
      expect(rows[0]!.name).toBe("a");
      expect(rows[1]!.id).toBe(2);
      expect(rows[1]!.name).toBe("b");
    } finally {
      await svc.close();
    }
  });

  it("reports native DuckDB column type names for the integer/timestamp golden", async () => {
    /*
     * Golden snapshot of the column-type names native DuckDB reports for
     * the canonical drift-risk types. The webview's duckdb-wasm path
     * historically reports BIGINT and INTEGER the same way; TIMESTAMP_NS
     * is the one that has drifted between minor releases. When this
     * snapshot changes we want a loud test failure, not a silent UI
     * regression in DesktopDuckDbClient consumers.
     */
    const svc = createDuckDbService(join(dir, "ava.duckdb"));
    try {
      const rows = await svc.runRawQuery<{
        column_name: string;
        column_type: string;
      }>(
        `describe select
           1::INTEGER as i32,
           1::BIGINT as i64,
           timestamp '2026-01-01 00:00:00' as ts_default,
           cast(timestamp '2026-01-01 00:00:00' as timestamp_ns) as ts_ns`,
        [],
      );

      const golden = Object.fromEntries(
        rows.map((row) => {
          return [row.column_name, row.column_type];
        }),
      );

      expect(golden).toEqual({
        i32: "INTEGER",
        i64: "BIGINT",
        ts_default: "TIMESTAMP",
        ts_ns: "TIMESTAMP_NS",
      });
    } finally {
      await svc.close();
    }
  });
});
