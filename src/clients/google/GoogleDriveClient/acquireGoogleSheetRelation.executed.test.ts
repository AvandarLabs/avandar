import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";
import type { GoogleSheetTabCsvReader } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";

/**
 * Acquisition read against a real reader rather than against a spy.
 *
 * DuckDB really reads the CSV the dataset route returns, so the assertions are
 * about rows that came out of a reader rather than about arguments that went
 * into a mock. Which tab that CSV comes from is decided server-side, by the
 * `google-sheets` edge function, and is tested there. The CSV uses CRLF, as
 * Google's export does.
 */

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;

vi.mock("$/db/supabase/AvaSupabase", async () => {
  return (
    await import("@/test-utils/createAvaSupabaseSessionMock")
  ).createAvaSupabaseSessionMock();
});

/** Answers the dataset's CSV route with the Kenya tab at `version`. */
function _makeDatasetFetch(version: string): EdgeFunctionFetch {
  return async () => {
    return new Response("city,population\r\nNairobi,4400000\r\n", {
      status: 200,
      headers: { "Content-Type": "text/csv", "X-Ava-Source-Version": version },
    });
  };
}

type Row = { city: string; population: bigint };

/**
 * A reader backed by a real in-process DuckDB. `read_csv` takes a path, so the
 * text is staged to a temp file, which is the same round trip the browser makes
 * through duckdb-wasm's virtual filesystem.
 */
const _readCsvWithDuckDb: GoogleSheetTabCsvReader<Row[]> = async ({
  csvText,
}) => {
  const stagedFile = path.join(
    tmpdir(),
    `ava-google-sheet-${process.pid}-${csvText.length}.csv`,
  );
  writeFileSync(stagedFile, csvText);

  return withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_csv('${stagedFile}', header = true)`,
    );
    return reader.getRowObjects() as unknown as Row[];
  });
};

describe("acquireGoogleSheetRelation", () => {
  it("reads the rows the dataset's route returned", async () => {
    const acquired = await acquireGoogleSheetRelation({
      datasetId: DATASET_ID,
      readCsv: _readCsvWithDuckDb,
      datasetFetch: _makeDatasetFetch("5"),
    });

    expect(acquired.relation).toEqual([
      { city: "Nairobi", population: 4_400_000n },
    ]);
    expect(acquired.sourceVersion).toBe("5");
  });

  it("types a numeric column as a number, the way the import did", async () => {
    // DuckDB hands a BIGINT back as a JS `bigint`; what matters is that it is
    // not a string.
    // The reason acquisition downloads CSV rather than exporting the workbook:
    // `read_xlsx` has to be told to read everything as text to avoid aborting
    // on a column whose type changes late, so re-acquiring through it retyped
    // every column of every dataset imported this way.
    const acquired = await acquireGoogleSheetRelation({
      datasetId: DATASET_ID,
      readCsv: _readCsvWithDuckDb,
      datasetFetch: _makeDatasetFetch("5"),
    });

    expect(typeof acquired.relation[0]?.population).toBe("bigint");
  });
});
