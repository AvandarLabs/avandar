import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("createPostgresConnector - whole-read deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a table as timeout once reading its rows runs past the deadline, without reading the rest", async () => {
    const pulledBatchIndexes: number[] = [];
    let isCursorClosed = false;
    // Each batch returns well inside the statement timeout, but the second
    // one arrives after the whole read's deadline has passed.
    async function* readRowBatches() {
      try {
        for (const batchIndex of [0, 1, 2]) {
          pulledBatchIndexes.push(batchIndex);
          if (batchIndex === 1) {
            vi.setSystemTime(10 * 60_000);
          }
          yield [{ id: batchIndex }];
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
            column_name: "id",
            data_type: "bigint",
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
      {
        connectionId: SAVED_CONNECTION_ID,
        relationId: "public.events",
        columnNames: ["id"],
      },
    );

    await expect(result).rejects.toBeInstanceOf(ConnectorError);
    await expect(result).rejects.toHaveProperty("code", "timeout");
    expect(pulledBatchIndexes).toEqual([0, 1]);
    expect(isCursorClosed).toBe(true);
  });
});
