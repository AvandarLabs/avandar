import { makeArrayWithLength } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeRowsCursor,
  makeFakeSqlForCursorRead,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
import type { FakeRowsCursor } from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";

const { minRows, maxGrowthFactor } =
  GlobalAppConfig.postgresConnector.rowsPerCursorBatch;

/**
 * Reads a one-column table of `rowCount` rows, with the clock jumping past
 * the whole read's deadline while the second fetch is in flight. Each fetch
 * returns well inside the statement timeout.
 */
function _readWithDeadlinePassingOnSecondFetch(rowCount: number): {
  cursor: FakeRowsCursor;
  result: Promise<Blob>;
} {
  const cursor = makeFakeRowsCursor(
    makeArrayWithLength(rowCount).map((id) => {
      return { id };
    }),
  );
  const fakeSql = makeFakeSqlForCursorRead({
    cursor,
    rowCount,
    columnName: "id",
    dataType: "bigint",
    onQuery: (queryText) => {
      if (
        queryText.includes("fetch forward") &&
        cursor.requestedBatchRowCounts.length === 1
      ) {
        vi.setSystemTime(10 * 60_000);
      }
    },
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
      relationId: "public.events",
      columnNames: ["id"],
    },
  );
  return { cursor, result };
}

describe("createPostgresConnector - whole-read deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a table as timeout once reading its rows runs past the deadline, without reading the rest", async () => {
    // More rows than the first two batches hold.
    const rowCount = minRows * (1 + maxGrowthFactor) + 1;

    const { cursor, result } = _readWithDeadlinePassingOnSecondFetch(rowCount);

    await expect(result).rejects.toBeInstanceOf(ConnectorError);
    await expect(result).rejects.toHaveProperty("code", "timeout");
    expect(cursor.requestedBatchRowCounts).toHaveLength(2);
    expect(cursor.fetchedRowCount()).toBeLessThan(rowCount);
  });

  it("finishes a read whose last batch was exactly full, even if the deadline passes during the empty fetch after it", async () => {
    const { cursor, result } = _readWithDeadlinePassingOnSecondFetch(minRows);

    await expect(result).resolves.toBeInstanceOf(Blob);
    expect(cursor.fetchedRowCount()).toBe(minRows);
  });
});
