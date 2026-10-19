import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeRowsCursor,
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
    const cursor = makeFakeRowsCursor(
      Array.from({ length: 500 }, (_, index) => {
        return { id: index };
      }),
    );
    const fakeSql = makeFakeSql((queryText, values) => {
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
      // Each batch returns well inside the statement timeout, but the second
      // one arrives after the whole read's deadline has passed.
      if (
        queryText.includes("fetch forward") &&
        cursor.requestedBatchRows.length === 1
      ) {
        vi.setSystemTime(10 * 60_000);
      }
      return cursor.respond(queryText, values);
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
    expect(cursor.requestedBatchRows).toHaveLength(2);
  });
});
