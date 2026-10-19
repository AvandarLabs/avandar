import { makeArrayWithLength } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeRowsCursor,
  makeFakeSqlForCursorRead,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";

const { minRows } = GlobalAppConfig.postgresConnector.rowsPerCursorBatch;

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
    // Each row is ~600 bytes of CSV, though the `notes` column is estimated
    // at 280 bytes and the count says three rows, so the pre-read check lets
    // the table through. The cursor holds several batches' worth of rows.
    const rows = makeArrayWithLength(minRows * 3).map(() => {
      return { notes: "x".repeat(600) };
    });
    const cursor = makeFakeRowsCursor(rows);
    const fakeSql = makeFakeSqlForCursorRead({
      cursor,
      rowCount: 3,
      columnName: "notes",
      dataType: "text",
    });
    const connector = createPostgresConnector({
      connectToPostgres: () => {
        return fakeSql;
      },
    });

    const result = connector.getRelationRows(
      makeSavedConnectionContext("8.8.8.8"),
      {
        connectionId: SAVED_CONNECTION_ID,
        relationId: "public.notes",
        columnNames: ["notes"],
      },
    );

    await expect(result).rejects.toBeInstanceOf(ConnectorError);
    await expect(result).rejects.toHaveProperty("code", "too_large");
    expect(cursor.requestedBatchRowCounts).toEqual([minRows]);
    expect(cursor.fetchedRowCount()).toBeLessThan(rows.length);
  });
});
