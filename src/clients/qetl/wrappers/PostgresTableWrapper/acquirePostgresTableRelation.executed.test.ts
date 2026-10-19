import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  PostgresRelationCsvReader,
  PostgresRowsFetch,
} from "@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation";

/**
 * Acquisition read against a real reader rather than against a spy, mirroring
 * `acquireGoogleSheetRelation.executed.test.ts`: DuckDB really reads the CSV
 * the edge function's dataset `rows` route returns, so the assertion is about
 * rows that came out of a reader, not about arguments that went into a mock.
 */

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          auth: {
            getSession: vi.fn(async () => {
              return {
                data: { session: { access_token: "test-access-token" } },
              };
            }),
          },
        };
      },
      getEdgeFunctionsURL: () => {
        return "https://project.supabase.co/functions/v1";
      },
    },
  };
});

type Row = { city: string; population: bigint };

const DATASET_ID = "44444444-4444-4444-8444-444444444444" as Dataset.Id;

/**
 * A reader backed by a real in-process DuckDB. `read_csv` takes a path, so the
 * text is staged to a temp file, the same round trip the browser makes
 * through duckdb-wasm's virtual filesystem.
 */
const _readCsvWithDuckDb: PostgresRelationCsvReader<Row[]> = async ({
  csvText,
}) => {
  const stagedFile = path.join(
    tmpdir(),
    `ava-postgres-table-${process.pid}-${csvText.length}.csv`,
  );
  writeFileSync(stagedFile, csvText);

  return withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_csv('${stagedFile}', header = true)`,
    );
    return reader.getRowObjects() as unknown as Row[];
  });
};

/** A fetch stub returning CSV text with the real route's content type. */
function _csvFetch(csvText: string): PostgresRowsFetch {
  return async () => {
    return new Response(csvText, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  };
}

/** A fetch stub returning the edge function's `{error}` JSON shape. */
function _errorFetch(code: string, message: string): PostgresRowsFetch {
  return async () => {
    return new Response(JSON.stringify({ error: { code, message } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

/**
 * A fetch stub for a response the edge function never got to shape itself -
 * the Supabase Edge Function runtime killing the isolate outright (a 546),
 * not a connector-classified failure. No `{error:{code,message}}` body, since
 * no line of this connector's own code ran to produce one.
 */
function _resourceLimitKillFetch(): PostgresRowsFetch {
  return async () => {
    return new Response("WORKER_LIMIT", {
      status: 546,
      headers: { "Content-Type": "text/plain" },
    });
  };
}

describe("acquirePostgresTableRelation", () => {
  it("reads the relation's rows through the edge function and transcodes them with a real DuckDB reader", async () => {
    const { acquirePostgresTableRelation } =
      await import("@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation");

    const acquired = await acquirePostgresTableRelation({
      datasetId: DATASET_ID,
      readCsv: _readCsvWithDuckDb,
      rowsFetch: _csvFetch("city,population\r\nNairobi,4400000\r\n"),
    });

    expect(acquired.relation).toEqual([
      { city: "Nairobi", population: 4_400_000n },
    ]);
    expect(acquired.sourceVersion).toBeUndefined();
  });

  it("types a numeric column as a bigint, not a string", async () => {
    // DuckDB hands a BIGINT back as a JS `bigint`; what matters is that it is
    // not a string - same reasoning `acquireGoogleSheetRelation`'s own test
    // documents for Sheets.
    const { acquirePostgresTableRelation } =
      await import("@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation");

    const acquired = await acquirePostgresTableRelation({
      datasetId: DATASET_ID,
      readCsv: _readCsvWithDuckDb,
      rowsFetch: _csvFetch("city,population\r\nNairobi,4400000\r\n"),
    });

    expect(typeof acquired.relation[0]?.population).toBe("bigint");
  });

  it("fails when the edge function reports a connector error, preserving its code", async () => {
    const { acquirePostgresTableRelation } =
      await import("@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation");

    try {
      await acquirePostgresTableRelation({
        datasetId: DATASET_ID,
        readCsv: _readCsvWithDuckDb,
        rowsFetch: _errorFetch("unreachable", "could not connect to server"),
      });
      expect.unreachable("Expected acquirePostgresTableRelation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("could not connect to server");
      expect((error as Error & { code: string }).code).toBe("unreachable");
    }
  });

  it("defaults to too_large when the edge function's own isolate was killed outright, not a connector-classified failure", async () => {
    const { acquirePostgresTableRelation } =
      await import("@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation");

    try {
      await acquirePostgresTableRelation({
        datasetId: DATASET_ID,
        readCsv: _readCsvWithDuckDb,
        rowsFetch: _resourceLimitKillFetch(),
      });
      expect.unreachable("Expected acquirePostgresTableRelation to throw");
    } catch (error) {
      expect((error as Error & { code: string }).code).toBe("too_large");
    }
  });
});
