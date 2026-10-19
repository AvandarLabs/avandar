import {
  type FakeRowsCursor,
  makeFakeRowsCursor,
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";

const { targetBytes, minRows, maxRows, maxGrowthFactor } =
  GlobalAppConfig.postgresConnector.rowsPerCursorBatch;

/** A row whose CSV line is `notes`, plus the line's `\r\n`. */
function _makeNotesRow(noteLength: number): Record<string, unknown> {
  return { notes: "x".repeat(noteLength) };
}

/**
 * Reads a one-column `text` relation holding `rows` through a fake cursor,
 * and returns that cursor.
 */
async function _readThroughFakeCursor(
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<FakeRowsCursor> {
  const cursor = makeFakeRowsCursor(rows);
  const fakeSql = makeFakeSql((queryText, values) => {
    if (queryText.includes("limit 1")) {
      return Promise.resolve([{ table_type: "BASE TABLE" }]);
    }
    if (queryText.includes("count(*)")) {
      return Promise.resolve([{ exact_count: String(rows.length) }]);
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
    return cursor.respond(queryText, values);
  });
  const connector = createPostgresConnector({
    connectToPostgres: () => {
      return fakeSql;
    },
  });
  await connector.getRelationRows(makeSavedConnectionContext("8.8.8.8"), {
    connectionId: SAVED_CONNECTION_ID,
    relationId: "public.notes",
    columnNames: ["notes"],
  });
  return cursor;
}

/** How many rows each cursor batch asked for, reading `rows`. */
async function _readRowsPerBatch(
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<number[]> {
  return (await _readThroughFakeCursor(rows)).requestedBatchRows;
}

describe("createPostgresConnector - cursor batch size", () => {
  it("reads a table no larger than the smallest batch in one round trip", async () => {
    const rows = Array.from({ length: minRows - 1 }, () => {
      return _makeNotesRow(5);
    });

    await expect(_readRowsPerBatch(rows)).resolves.toEqual([minRows]);
  });

  it("grows a narrow table's batches by at most the growth factor each, up to the largest batch", async () => {
    // Narrow enough that the target bytes never bind: only growth and the
    // largest batch do.
    const rows = Array.from({ length: 70_000 }, () => {
      return _makeNotesRow(5);
    });

    const rowsPerBatch = await _readRowsPerBatch(rows);

    expect(rowsPerBatch.slice(0, 4)).toEqual([
      minRows,
      minRows * maxGrowthFactor,
      minRows * maxGrowthFactor ** 2,
      minRows * maxGrowthFactor ** 3,
    ]);
    expect(rowsPerBatch.slice(4)).toEqual([maxRows, maxRows]);
  });

  it("sizes a wide table's batches to hold about the target bytes, measured from its widest row", async () => {
    // A 100KB note, plus its line's `\r\n`.
    const widestRowBytes = 100_000 + 2;
    const rows = Array.from({ length: 200 }, () => {
      return _makeNotesRow(100_000);
    });

    const rowsPerBatch = await _readRowsPerBatch(rows);

    const rowsForTarget = Math.floor(targetBytes / widestRowBytes);
    expect(rowsPerBatch).toEqual([
      minRows,
      rowsForTarget,
      rowsForTarget,
      rowsForTarget,
    ]);
  });

  it("shrinks the next batch as soon as rows get wider partway through", async () => {
    const narrowRows = Array.from({ length: minRows }, () => {
      return _makeNotesRow(5);
    });
    const wideRows = Array.from({ length: 300 }, () => {
      return _makeNotesRow(100_000);
    });

    const rowsPerBatch = await _readRowsPerBatch([...narrowRows, ...wideRows]);

    // The first batch is all narrow, so the second may grow. It holds wide
    // rows, so the third is sized for them.
    expect(rowsPerBatch.slice(0, 3)).toEqual([
      minRows,
      minRows * maxGrowthFactor,
      Math.floor(targetBytes / (100_000 + 2)),
    ]);
  });

  // A prepared `fetch forward 10 from ...` keeps the row description of the
  // first relation it read. Another relation fetched with the same text on
  // that connection would be parsed with the wrong columns.
  it("sends every fetch unprepared, so no fetch reuses another cursor's row description", async () => {
    const rows = Array.from({ length: 500 }, () => {
      return _makeNotesRow(5);
    });

    const cursor = await _readThroughFakeCursor(rows);

    expect(cursor.requestedBatchRows.length).toBeGreaterThan(1);
    expect(cursor.unpreparedFetchCount()).toBe(
      cursor.requestedBatchRows.length,
    );
  });

  it("never asks for fewer than the smallest batch, however wide a row is", async () => {
    // Each row alone is more than a tenth of the target bytes.
    const hugeNote = "x".repeat(Math.ceil(targetBytes / minRows) + 1);
    const rows = Array.from({ length: minRows * 2 + 1 }, () => {
      return { notes: hugeNote };
    });

    await expect(_readRowsPerBatch(rows)).resolves.toEqual([
      minRows,
      minRows,
      minRows,
    ]);
  });
});
