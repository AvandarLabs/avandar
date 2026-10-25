import { makeArrayWithLength } from "@avandar/utils";
import {
  type FakeRowsCursor,
  makeFakeRowsCursor,
  makeFakeSqlForCursorRead,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";

const { targetBytes, minRows, maxRows, maxGrowthFactor } =
  GlobalAppConfig.postgresConnector.rowsPerCursorBatch;

/**
 * A one-column row whose CSV line is its `notes` value: `noteLength` copies
 * of `character`, plus the line's `\r\n`.
 */
function _makeNotesRow(
  noteLength: number,
  character = "x",
): Record<string, unknown> {
  return { notes: character.repeat(noteLength) };
}

/** `rowCount` copies of the same notes row. */
function _makeNotesRows(
  options: Readonly<{ rowCount: number; noteLength: number }>,
): Array<Record<string, unknown>> {
  return makeArrayWithLength(options.rowCount).map(() => {
    return _makeNotesRow(options.noteLength);
  });
}

/**
 * Reads a one-column `text` relation holding `rows` through a fake cursor,
 * and returns that cursor.
 */
async function _readThroughFakeCursor(
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<FakeRowsCursor> {
  const cursor = makeFakeRowsCursor(rows);
  const fakeSql = makeFakeSqlForCursorRead({
    cursor,
    rowCount: rows.length,
    columnName: "notes",
    dataType: "text",
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
async function _readRowCountsPerBatch(
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<number[]> {
  return (await _readThroughFakeCursor(rows)).requestedBatchRowCounts;
}

describe("createPostgresConnector - cursor batch size", () => {
  it("reads a table smaller than the smallest batch in one round trip", async () => {
    const rows = _makeNotesRows({ rowCount: minRows - 1, noteLength: 5 });

    await expect(_readRowCountsPerBatch(rows)).resolves.toEqual([minRows]);
  });

  it("grows a narrow table's batches by at most the growth factor each, up to the largest batch", async () => {
    // Narrow enough that the target bytes never bind: only growth and the
    // largest batch do.
    const rows = _makeNotesRows({ rowCount: 70_000, noteLength: 5 });

    const rowCountsPerBatch = await _readRowCountsPerBatch(rows);

    expect(rowCountsPerBatch.slice(0, 4)).toEqual([
      minRows,
      minRows * maxGrowthFactor,
      minRows * maxGrowthFactor ** 2,
      minRows * maxGrowthFactor ** 3,
    ]);
    expect(rowCountsPerBatch.slice(4)).toEqual([maxRows, maxRows]);
  });

  it("sizes each batch of a table of wide rows to hold about the target bytes", async () => {
    // A 100KB note, plus its line's `\r\n`.
    const rowBytes = 100_000 + 2;
    const rows = _makeNotesRows({ rowCount: 200, noteLength: 100_000 });

    const rowCountsPerBatch = await _readRowCountsPerBatch(rows);

    const rowsForTarget = Math.floor(targetBytes / rowBytes);
    expect(rowCountsPerBatch).toEqual([
      minRows,
      rowsForTarget,
      rowsForTarget,
      rowsForTarget,
    ]);
  });

  it("sizes the next batch from the widest row of the batch before, not its average", async () => {
    const rows = [
      ..._makeNotesRows({ rowCount: minRows - 1, noteLength: 5 }),
      _makeNotesRow(100_000),
      ..._makeNotesRows({ rowCount: 300, noteLength: 5 }),
    ];

    const rowCountsPerBatch = await _readRowCountsPerBatch(rows);

    expect(rowCountsPerBatch[1]).toBe(Math.floor(targetBytes / (100_000 + 2)));
  });

  it("measures a row's width in bytes, not characters", async () => {
    // The CJK row is shorter in characters but, at 3 bytes per character,
    // wider in bytes than the ASCII rows around it.
    const cjkRowBytes = 30_000 * 3 + 2;
    const rows = [
      ..._makeNotesRows({ rowCount: minRows - 1, noteLength: 40_000 }),
      _makeNotesRow(30_000, "漢"),
      ..._makeNotesRows({ rowCount: 300, noteLength: 5 }),
    ];

    const rowCountsPerBatch = await _readRowCountsPerBatch(rows);

    expect(rowCountsPerBatch[1]).toBe(Math.floor(targetBytes / cjkRowBytes));
  });

  it("shrinks the next batch as soon as rows get wider partway through", async () => {
    // Wide enough that the target bytes bind below the growth limit.
    const wideNoteLength = Math.ceil(
      (2 * targetBytes) / (minRows * maxGrowthFactor),
    );
    const rows = [
      ..._makeNotesRows({ rowCount: minRows, noteLength: 5 }),
      ..._makeNotesRows({ rowCount: 100, noteLength: wideNoteLength }),
    ];

    const rowCountsPerBatch = await _readRowCountsPerBatch(rows);

    // The first batch is all narrow, so the second may grow. It holds wide
    // rows, so the third is sized for them.
    expect(rowCountsPerBatch.slice(0, 2)).toEqual([
      minRows,
      minRows * maxGrowthFactor,
    ]);
    expect(rowCountsPerBatch[2]).toBe(
      Math.floor(targetBytes / (wideNoteLength + 2)),
    );
    expect(rowCountsPerBatch[2]).toBeLessThan(minRows * maxGrowthFactor);
  });

  // A prepared `fetch forward 10 from ...` keeps the row description of the
  // first relation it read. Another relation fetched with the same text on
  // that connection would be parsed with the wrong columns.
  it("sends every fetch unprepared, so no fetch reuses another cursor's row description", async () => {
    const rows = _makeNotesRows({ rowCount: 500, noteLength: 5 });

    const cursor = await _readThroughFakeCursor(rows);

    expect(cursor.requestedBatchRowCounts.length).toBeGreaterThan(1);
    expect(cursor.unpreparedFetchCount()).toBe(
      cursor.requestedBatchRowCounts.length,
    );
  });

  it("never asks for fewer than the smallest batch, however wide a row is", async () => {
    // Each row alone is wider than the target bytes divided by the smallest
    // batch, so even that batch overshoots the target.
    const rows = _makeNotesRows({
      rowCount: minRows * 2 + 1,
      noteLength: Math.ceil(targetBytes / minRows) + 1,
    });

    await expect(_readRowCountsPerBatch(rows)).resolves.toEqual([
      minRows,
      minRows,
      minRows,
    ]);
  });
});
