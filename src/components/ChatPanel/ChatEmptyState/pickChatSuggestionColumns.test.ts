import { describe, expect, it } from "vitest";
import {
  isIdentifierColumnName,
  isNonAverageableColumnName,
  isNonGroupableColumnName,
  pickAverageColumn,
  pickGroupByColumn,
} from "@/components/ChatPanel/ChatEmptyState/pickChatSuggestionColumns";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

type ColumnMeta = Pick<DatasetColumnRead, "name" | "dataType" | "columnIdx">;

function _col(
  name: string,
  dataType: ColumnMeta["dataType"],
  columnIdx: number,
): ColumnMeta {
  return { name, dataType, columnIdx };
}

function _textSummary(
  name: string,
  distinctValuesCount: number,
): ColumnSummary {
  return {
    name,
    type: "text",
    distinctValuesCount,
    emptyValuesCount: 0,
    percentMissingValues: 0,
    mostCommonValue: { count: 1, value: ["a"] },
  };
}

describe("isIdentifierColumnName", () => {
  it("matches id, uuid, and uid exactly (case insensitive)", () => {
    expect(isIdentifierColumnName("ID")).toBe(true);
    expect(isIdentifierColumnName("uuid")).toBe(true);
    expect(isIdentifierColumnName("UID")).toBe(true);
  });

  it("does not match compound or suffixed names", () => {
    expect(isIdentifierColumnName("user_id")).toBe(false);
    expect(isIdentifierColumnName("uuid_v2")).toBe(false);
  });
});

describe("isNonGroupableColumnName", () => {
  it("treats common identifier and audit columns as non-groupable", () => {
    expect(isNonGroupableColumnName("id")).toBe(true);
    expect(isNonGroupableColumnName("UUID")).toBe(true);
    expect(isNonGroupableColumnName("UID")).toBe(true);
    expect(isNonGroupableColumnName("user_id")).toBe(true);
    expect(isNonGroupableColumnName("created_at")).toBe(true);
  });

  it("allows typical categorical columns", () => {
    expect(isNonGroupableColumnName("category")).toBe(false);
    expect(isNonGroupableColumnName("region")).toBe(false);
    expect(isNonGroupableColumnName("product_name")).toBe(false);
  });
});

describe("pickGroupByColumn", () => {
  it("returns the first text column when no summaries are cached", () => {
    const columns = [
      _col("id", "bigint", 0),
      _col("amount", "double", 1),
      _col("region", "varchar", 2),
      _col("status", "varchar", 3),
    ];
    expect(pickGroupByColumn(columns)).toBe("region");
  });

  it("skips non-groupable text columns for the no-cache fallback", () => {
    const columns = [
      _col("id", "varchar", 0),
      _col("uuid", "varchar", 1),
      _col("UID", "varchar", 2),
      _col("category", "varchar", 3),
    ];
    expect(pickGroupByColumn(columns)).toBe("category");
  });

  it("prefers a cached text column with fewer than 10 distinct values", () => {
    const columns = [
      _col("region", "varchar", 0),
      _col("category", "varchar", 1),
      _col("notes", "varchar", 2),
    ];
    const summaries = new Map<string, ColumnSummary>([
      ["region", _textSummary("region", 50)],
      ["category", _textSummary("category", 4)],
      ["notes", _textSummary("notes", 200)],
    ]);
    expect(pickGroupByColumn(columns, summaries)).toBe("category");
  });

  it("picks the text column with the fewest known distinct values when none are enum-like", () => {
    const columns = [
      _col("region", "varchar", 0),
      _col("category", "varchar", 1),
    ];
    const summaries = new Map<string, ColumnSummary>([
      ["region", _textSummary("region", 50)],
      ["category", _textSummary("category", 12)],
    ]);
    expect(pickGroupByColumn(columns, summaries)).toBe("category");
  });

  it("returns undefined when there are no text columns", () => {
    expect(pickGroupByColumn([_col("amount", "double", 0)])).toBeUndefined();
  });

  it("excludes already-used group-by columns when picking a second dimension", () => {
    const columns = [
      _col("region", "varchar", 0),
      _col("category", "varchar", 1),
      _col("status", "varchar", 2),
    ];
    expect(
      pickGroupByColumn(columns, undefined, {
        excludeColumnNames: ["region"],
      }),
    ).toBe("category");
  });
});

describe("isNonAverageableColumnName", () => {
  it("treats phone, SSN, and postal columns as non-averageable", () => {
    expect(isNonAverageableColumnName("phone_number")).toBe(true);
    expect(isNonAverageableColumnName("SSN")).toBe(true);
    expect(isNonAverageableColumnName("zip_code")).toBe(true);
    expect(isNonAverageableColumnName("customer_mobile")).toBe(true);
  });

  it("allows typical measure columns", () => {
    expect(isNonAverageableColumnName("amount")).toBe(false);
    expect(isNonAverageableColumnName("revenue")).toBe(false);
    expect(isNonAverageableColumnName("quantity")).toBe(false);
  });
});

describe("pickAverageColumn", () => {
  it("returns the first numeric column by column index", () => {
    const columns = [
      _col("name", "varchar", 0),
      _col("amount", "double", 1),
      _col("count", "bigint", 2),
    ];
    expect(pickAverageColumn(columns)).toBe("amount");
  });

  it("returns undefined when there are no numeric columns", () => {
    expect(pickAverageColumn([_col("name", "varchar", 0)])).toBeUndefined();
  });

  it("skips identifier columns even when stored as numeric types", () => {
    const columns = [
      _col("ID", "bigint", 0),
      _col("UUID", "double", 1),
      _col("UID", "bigint", 2),
      _col("amount", "double", 3),
    ];
    expect(pickAverageColumn(columns)).toBe("amount");
  });

  it("skips phone and SSN columns stored as numeric types", () => {
    const columns = [
      _col("phone", "bigint", 0),
      _col("ssn", "double", 1),
      _col("zip", "bigint", 2),
      _col("total_amount", "double", 3),
    ];
    expect(pickAverageColumn(columns)).toBe("total_amount");
  });

  it("returns undefined when every numeric column is non-averageable", () => {
    const columns = [
      _col("id", "bigint", 0),
      _col("phone_number", "double", 1),
      _col("zip_code", "bigint", 2),
    ];
    expect(pickAverageColumn(columns)).toBeUndefined();
  });
});
