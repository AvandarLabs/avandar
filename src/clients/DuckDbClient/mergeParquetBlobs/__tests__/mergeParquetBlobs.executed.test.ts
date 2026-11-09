/**
 * Pins that reading a list of Parquet files returns every row of the first
 * file, then every row of the next, which is what keeps a merged copy's rows
 * in order.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";

describe("mergeParquetBlobs row-order contract", () => {
  it("reads a file list in list order, each file in its own row order", async () => {
    const directory = await mkdtemp(join(tmpdir(), "merge-parquet-"));
    try {
      await withDuckDb(async (connection) => {
        const firstPath = join(directory, "part-00000.parquet");
        const secondPath = join(directory, "part-00001.parquet");
        await connection.run(
          `COPY (SELECT range AS id FROM range(0, 5000)) TO '${firstPath}' (FORMAT parquet)`,
        );
        await connection.run(
          `COPY (SELECT range AS id FROM range(5000, 10000)) TO '${secondPath}' (FORMAT parquet)`,
        );

        const merged = await connection.runAndReadAll(
          `SELECT id FROM read_parquet(['${firstPath}', '${secondPath}'])`,
        );

        const ids = merged.getRowObjects().map((row) => {
          return Number(row.id);
        });
        expect(ids).toEqual(
          Array.from({ length: 10000 }, (_unused, index) => {
            return index;
          }),
        );
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
