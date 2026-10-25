import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";

describe("createPostgresConnector - Postgres's own catalogs", () => {
  it.each(["pg_catalog.pg_authid", "information_schema.tables"])(
    "refuses to preview %s without querying it",
    async (relationId) => {
      const queryTexts: string[] = [];
      const fakeSql = makeFakeSql((queryText) => {
        queryTexts.push(queryText);
        return Promise.resolve([{ table_type: "BASE TABLE" }]);
      });
      const connector = createPostgresConnector({
        connectToPostgres: () => {
          return fakeSql;
        },
      });

      const preview = connector.previewRelation(
        makeSavedConnectionContext("8.8.8.8"),
        SAVED_CONNECTION_ID,
        relationId,
      );

      await expect(preview).rejects.toBeInstanceOf(ConnectorError);
      expect(
        queryTexts.some((queryText) => {
          return queryText.includes("information_schema.tables");
        }),
      ).toBe(false);
    },
  );
});
