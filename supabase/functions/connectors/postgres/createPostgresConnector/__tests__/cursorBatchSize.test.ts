import { prop } from "@avandar/utils";
import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";

const { targetBytes, minRows, maxRows } =
  GlobalAppConfig.postgresConnector.rowsPerCursorBatch;

/**
 * Reads a three-row relation with these columns, and returns how many rows
 * each cursor batch asked the database for.
 */
async function _readRowsPerBatch(
  columns: ReadonlyArray<{
    column_name: string;
    data_type: string;
    character_maximum_length: number | null;
  }>,
): Promise<number[]> {
  const requestedRowsPerBatch: number[] = [];
  const fakeSql = makeFakeSql((queryText) => {
    if (queryText.includes("limit 1")) {
      return Promise.resolve([{ table_type: "BASE TABLE" }]);
    }
    if (queryText.includes("count(*)")) {
      return Promise.resolve([{ exact_count: "3" }]);
    }
    if (queryText.includes("character_maximum_length")) {
      return Promise.resolve(columns);
    }
    return Object.assign(Promise.resolve([]), {
      cursor: async function* (rowsPerBatch: number) {
        requestedRowsPerBatch.push(rowsPerBatch);
        yield [];
      },
    });
  });
  const connector = createPostgresConnector({
    connectToPostgres: () => {
      return fakeSql;
    },
  });
  await connector.getRelationRows(makeSavedConnectionContext("8.8.8.8"), {
    connectionId: SAVED_CONNECTION_ID,
    relationId: "public.events",
    columnNames: columns.map(prop("column_name")),
  });
  return requestedRowsPerBatch;
}

describe("createPostgresConnector - cursor batch size", () => {
  it("reads a narrow table in the largest batches, so a small one arrives in one round trip", async () => {
    const rowsPerBatch = await _readRowsPerBatch([
      {
        column_name: "id",
        data_type: "integer",
        character_maximum_length: null,
      },
      {
        column_name: "is_active",
        data_type: "boolean",
        character_maximum_length: null,
      },
    ]);

    expect(rowsPerBatch).toEqual([maxRows]);
  });

  it("sizes each batch of a wide table to hold about the target bytes of CSV", async () => {
    // A `character(4096)` value is always padded to 4,096 bytes, plus the
    // row's `\r\n`.
    const estimatedRowBytes = 4_096 + 2;

    const rowsPerBatch = await _readRowsPerBatch([
      {
        column_name: "payload",
        data_type: "character",
        character_maximum_length: 4_096,
      },
    ]);

    expect(rowsPerBatch).toEqual([Math.floor(targetBytes / estimatedRowBytes)]);
  });

  it("never asks for fewer than the smallest batch, however wide a row is", async () => {
    const rowsPerBatch = await _readRowsPerBatch([
      {
        column_name: "payload",
        data_type: "character",
        character_maximum_length: 10_000_000,
      },
    ]);

    expect(rowsPerBatch).toEqual([minRows]);
  });
});
