import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { DateFormatSql } from "@/lib/crosswalks/detectDateFormats/DateFormatSql/DateFormatSql";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = uuid<Dataset.Id>();
const HOSTILE_NAME = `Case "no" O'Brien`;
const COLUMN_NAMES = [
  "onset_dt",
  "iso",
  "eu",
  "ambiguous",
  "half_iso",
  "blanks",
  HOSTILE_NAME,
];

/**
 * This suite lives under `src/` beside the module it tests, and reuses
 * `withDuckDb` as the other executed tests do.
 */
describe("DateFormatSql", () => {
  it("picks the first format that parses 90% of each text column's sample", async () => {
    const formats = await withDuckDb(async (connection) => {
      await connection.run(`
        CREATE TABLE "${DATASET_ID}" AS
        SELECT
          CASE WHEN i = 0 THEN 'not a date'
            ELSE strftime(DATE '2026-02-01' + CAST(i AS INTEGER), '%m/%d/%Y') END AS onset_dt,
          strftime(DATE '2026-02-01' + CAST(i AS INTEGER), '%Y-%m-%d') AS iso,
          strftime(DATE '2026-03-13' + CAST(i AS INTEGER), '%d/%m/%Y') AS eu,
          strftime(DATE '2026-01-01' + CAST(i % 12 AS INTEGER), '%m/%d/%Y') AS ambiguous,
          CASE WHEN i < 20 THEN '2026-03-01' ELSE 'March 1' END AS half_iso,
          CASE WHEN i % 4 = 0 THEN ''
            ELSE strftime(DATE '2026-02-01' + CAST(i AS INTEGER), '%Y-%m-%d') END AS blanks,
          'NY-' || CAST(i AS VARCHAR) AS "Case ""no"" O'Brien"
        FROM range(0, 40) AS t(i)
      `);
      const reader = await connection.runAndReadAll(
        DateFormatSql.buildDetectSql({
          relationName: DATASET_ID,
          columnNames: COLUMN_NAMES,
        }),
      );
      return DateFormatSql.pickFormats({
        columnNames: COLUMN_NAMES,
        row: reader.getRowObjects()[0] ?? {},
      });
    });

    expect(formats).toEqual(
      new Map([
        // 39 of 40 values parse: one bad value does not lose the format.
        ["onset_dt", "%m/%d/%Y"],
        ["iso", "%Y-%m-%d"],
        // Days 13 and up cannot be months, so US parses too few.
        ["eu", "%d/%m/%Y"],
        // Every day is 12 or less, so both orders parse: US comes first.
        ["ambiguous", "%m/%d/%Y"],
        // Blank values are not counted against a format.
        ["blanks", "%Y-%m-%d"],
      ]),
    );
  });
});
