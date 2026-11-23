import { makeArrayWithLength } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeRowsCursor,
  makeFakeSqlForCursorRead,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";

const { trustBelowCapFraction, trustAboveCapMultiple } =
  GlobalAppConfig.postgresConnector.rowCountEstimate;

/** The estimated CSV width of one row of the one-`bigint`-column table. */
const ROW_BYTES = PostgresCsvEstimate.estimateRowCsvBytes([
  { columnName: "id", dataType: "bigint", characterMaximumLength: null },
]);

/** How many rows of the table are estimated at `capMultiple` of the cap. */
function _getRowCountAtCapMultiple(capMultiple: number): number {
  return Math.floor((POSTGRES_MAX_BYTES_PER_ACQUIRE * capMultiple) / ROW_BYTES);
}

/**
 * Reads a one-column table whose cursor holds three rows, with the planner
 * estimating `plannedRowCount` rows and an exact count reporting
 * `exactRowCount`. Returns the read and every query sent.
 */
function _readWithRowCounts(
  options: Readonly<{
    plannedRowCount: number;
    exactRowCount: number;
    tableType?: string;
  }>,
): { result: Promise<Blob>; sentQueryTexts: string[] } {
  const sentQueryTexts: string[] = [];
  const fakeSql = makeFakeSqlForCursorRead({
    cursor: makeFakeRowsCursor(
      makeArrayWithLength(3).map((id) => {
        return { id };
      }),
    ),
    rowCount: options.exactRowCount,
    plannedRowCount: options.plannedRowCount,
    tableType: options.tableType,
    columnName: "id",
    dataType: "bigint",
    onQuery: (queryText) => {
      sentQueryTexts.push(queryText);
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
  return { result, sentQueryTexts };
}

/** Whether any sent query is the exact row count. */
function _hasCountedRows(sentQueryTexts: readonly string[]): boolean {
  return sentQueryTexts.some((queryText) => {
    return queryText.includes("count(*)");
  });
}

describe("createPostgresConnector - row count before reading", () => {
  it("trusts the planner's estimate of a table well within the cap, without counting its rows", async () => {
    const { result, sentQueryTexts } = _readWithRowCounts({
      plannedRowCount: _getRowCountAtCapMultiple(trustBelowCapFraction / 2),
      exactRowCount: 3,
    });

    await expect(result).resolves.toBeInstanceOf(Blob);
    expect(_hasCountedRows(sentQueryTexts)).toBe(false);
  });

  it("counts the rows exactly when the estimate is too close to the cap to decide, and reads a table that fits", async () => {
    // A stale estimate puts the table over the cap, but it fits.
    const { result, sentQueryTexts } = _readWithRowCounts({
      plannedRowCount: _getRowCountAtCapMultiple(
        Math.min(2, trustAboveCapMultiple),
      ),
      exactRowCount: 3,
    });

    await expect(result).resolves.toBeInstanceOf(Blob);
    expect(_hasCountedRows(sentQueryTexts)).toBe(true);
  });

  it("refuses a table whose exact count is over the cap, before reading a row", async () => {
    const { result, sentQueryTexts } = _readWithRowCounts({
      plannedRowCount: _getRowCountAtCapMultiple(
        (trustBelowCapFraction + 1) / 2,
      ),
      exactRowCount: _getRowCountAtCapMultiple(1.5),
    });

    await expect(result).rejects.toBeInstanceOf(ConnectorError);
    await expect(result).rejects.toHaveProperty("code", "too_large");
    expect(_hasCountedRows(sentQueryTexts)).toBe(true);
    expect(
      sentQueryTexts.some((queryText) => {
        return queryText.includes("declare");
      }),
    ).toBe(false);
  });

  it("refuses a table the planner estimates far over the cap, without counting its rows", async () => {
    const { result, sentQueryTexts } = _readWithRowCounts({
      plannedRowCount: _getRowCountAtCapMultiple(trustAboveCapMultiple * 2),
      exactRowCount: 3,
    });

    await expect(result).rejects.toHaveProperty("code", "too_large");
    await expect(result).rejects.toThrow("planner's estimate");
    expect(_hasCountedRows(sentQueryTexts)).toBe(false);
  });

  // A view's estimate comes from guessed selectivities, which can be off by
  // far more than a table's.
  it("counts a view's rows exactly before refusing it, however far over the cap the planner estimates", async () => {
    const { result, sentQueryTexts } = _readWithRowCounts({
      plannedRowCount: _getRowCountAtCapMultiple(trustAboveCapMultiple * 2),
      exactRowCount: 3,
      tableType: "VIEW",
    });

    await expect(result).resolves.toBeInstanceOf(Blob);
    expect(_hasCountedRows(sentQueryTexts)).toBe(true);
  });
});
