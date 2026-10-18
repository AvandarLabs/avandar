import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";

// A 1KB cap stands in for the real 150MB one, so a table can cross it with
// a few short rows instead of 150MB of test data.
vi.mock(
  "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts",
  async (importOriginal) => {
    return {
      ...(await importOriginal<object>()),
      POSTGRES_MAX_BYTES_PER_ACQUIRE: 1_000,
    };
  },
);

describe("createPostgresConnector - streamed rows past the byte cap", () => {
  it("refuses a table wider than estimated as soon as its CSV crosses the cap, without reading the rest", async () => {
    const pulledBatchIndexes: number[] = [];
    let isCursorClosed = false;
    // Each batch is one ~600-byte row, though the `notes` column is
    // estimated at 280 bytes, so the pre-read check lets three rows through.
    async function* readRowBatches() {
      try {
        for (const batchIndex of [0, 1, 2]) {
          pulledBatchIndexes.push(batchIndex);
          yield [{ notes: "x".repeat(600) }];
        }
      } finally {
        isCursorClosed = true;
      }
    }
    const fakeSql = makeFakeSql((queryText) => {
      if (queryText.includes("limit 1")) {
        return Promise.resolve([{ table_type: "BASE TABLE" }]);
      }
      if (queryText.includes("count(*)")) {
        return Promise.resolve([{ exact_count: "3" }]);
      }
      if (queryText.includes("character_maximum_length")) {
        return Promise.resolve([
          {
            column_name: "notes",
            data_type: "text",
            character_maximum_length: null,
          },
        ]);
      }
      return Object.assign(Promise.resolve([]), { cursor: readRowBatches });
    });
    const connector = createPostgresConnector({
      connectToPostgres: () => {
        return fakeSql;
      },
    });

    const result = connector.getRelationRows(
      makeSavedConnectionContext("8.8.8.8"),
      SAVED_CONNECTION_ID,
      "public.notes",
    );

    await expect(result).rejects.toBeInstanceOf(ConnectorError);
    await expect(result).rejects.toHaveProperty("code", "too_large");
    expect(pulledBatchIndexes).toEqual([0, 1]);
    expect(isCursorClosed).toBe(true);
  });
});
