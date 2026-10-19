import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeQueryPlan,
  makeFakeRowsCursor,
  makeFakeSql,
  makeSavedConnectionContext,
  readBlobText,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";

/** `information_schema.columns` for a table with one column no dataset uses. */
const TABLE_COLUMNS = [
  { column_name: "id", data_type: "integer", character_maximum_length: null },
  {
    column_name: "salary",
    data_type: "integer",
    character_maximum_length: null,
  },
  { column_name: "name", data_type: "text", character_maximum_length: null },
];

/** One query sent to the database: its text and its interpolated values. */
type SentQuery = { queryText: string; values: unknown[] };

/**
 * Reads `public.staff` as a dataset storing `columnNames`, and returns the
 * CSV text alongside every query sent to the database.
 */
async function _readDatasetRows(
  columnNames: readonly string[],
): Promise<{ csvText: Promise<string>; sentQueries: SentQuery[] }> {
  const sentQueries: SentQuery[] = [];
  const cursor = makeFakeRowsCursor([{ id: 7, salary: 90_000, name: "Ada" }]);
  const fakeSql = makeFakeSql((queryText, values) => {
    sentQueries.push({ queryText, values });
    if (queryText.includes("limit 1")) {
      return Promise.resolve([{ table_type: "BASE TABLE" }]);
    }
    if (queryText.includes("explain")) {
      return makeFakeQueryPlan(1);
    }
    if (queryText.includes("count(*)")) {
      return Promise.resolve([{ exact_count: "1" }]);
    }
    if (queryText.includes("character_maximum_length")) {
      return Promise.resolve(TABLE_COLUMNS);
    }
    return cursor.respond(queryText, values);
  });
  const connector = createPostgresConnector({
    connectToPostgres: () => {
      return fakeSql;
    },
  });
  const csvBlob = connector.getRelationRows(
    makeSavedConnectionContext("8.8.8.8"),
    {
      connectionId: SAVED_CONNECTION_ID,
      relationId: "public.staff",
      columnNames,
    },
  );
  const csvText = csvBlob.then(readBlobText);
  await csvText.catch(() => {
    // Asserted by the caller.
  });
  return { csvText, sentQueries };
}

/**
 * The cursor declaration that reads rows, found by the column list it
 * selects.
 */
function _findRowsQuery(
  options: Readonly<{ sentQueries: readonly SentQuery[]; columnList: string }>,
): SentQuery | undefined {
  return options.sentQueries.find((sentQuery) => {
    return (
      sentQuery.queryText.includes("cursor for select") &&
      sentQuery.values.includes(options.columnList)
    );
  });
}

describe("createPostgresConnector - reading only a dataset's columns", () => {
  it("selects only the dataset's stored columns, in their stored order", async () => {
    const { csvText, sentQueries } = await _readDatasetRows(["name", "id"]);

    await expect(csvText).resolves.toBe("name,id\r\nAda,7");
    const rowsQuery = _findRowsQuery({
      sentQueries,
      columnList: '"name", "id"',
    });
    expect(rowsQuery?.queryText).toMatch(/cursor for select\s+from\s*$/);
  });

  it("refuses a table that no longer has one of the dataset's columns, without reading a row", async () => {
    const { csvText, sentQueries } = await _readDatasetRows(["id", "email"]);

    await expect(csvText).rejects.toBeInstanceOf(ConnectorError);
    await expect(csvText).rejects.toThrow("'email'");
    expect(
      _findRowsQuery({ sentQueries, columnList: '"id", "email"' }),
    ).toBeUndefined();
  });
});
