import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";

describe("createPostgresConnector - preview column types", () => {
  it("reports each column's type from the table's own schema, mapped to the type it is queried as", async () => {
    const fakeSql = makeFakeSql((queryText) => {
      if (queryText.includes("information_schema.tables")) {
        return Promise.resolve([{ table_type: "BASE TABLE" }]);
      }
      if (queryText.includes("information_schema.columns")) {
        return Promise.resolve([
          { column_name: "id", data_type: "integer" },
          { column_name: "zip_code", data_type: "text" },
          {
            column_name: "signed_up_at",
            data_type: "timestamp with time zone",
          },
          { column_name: "opens_at", data_type: "time with time zone" },
        ]);
      }
      return Promise.resolve([]);
    });
    const connector = createPostgresConnector({
      connectToPostgres: () => {
        return fakeSql;
      },
    });

    const preview = await connector.previewRelation(
      makeSavedConnectionContext("8.8.8.8"),
      SAVED_CONNECTION_ID,
      "public.customers",
    );

    expect(preview.columns).toEqual([
      { columnName: "id", sourceType: "integer", dataType: "bigint" },
      { columnName: "zip_code", sourceType: "text", dataType: "varchar" },
      {
        columnName: "signed_up_at",
        sourceType: "timestamp with time zone",
        dataType: "timestamp",
      },
      // DuckDB's `TIME` would drop the offset, so it stays text.
      {
        columnName: "opens_at",
        sourceType: "time with time zone",
        dataType: "varchar",
      },
    ]);
  });
});
