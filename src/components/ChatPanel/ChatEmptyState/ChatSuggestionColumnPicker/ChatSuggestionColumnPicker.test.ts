import { describe, expect, it } from "vitest";
import { ChatSuggestionColumnPicker } from "./ChatSuggestionColumnPicker";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";

type ColumnMeta = Pick<DatasetColumn.T, "name" | "dataType" | "columnIdx">;

function createColumnMeta(
  name: string,
  dataType: ColumnMeta["dataType"],
  columnIdx: number,
): ColumnMeta {
  return { name, dataType, columnIdx };
}

function createTextColumnSummary(
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
  const { isIdentifierColumnName } = ChatSuggestionColumnPicker;
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
  const { isNonGroupableColumnName } = ChatSuggestionColumnPicker;
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
  const { pickGroupByColumn } = ChatSuggestionColumnPicker;
  it("returns the first text column when no summaries are cached", () => {
    const columns = [
      createColumnMeta("id", "bigint", 0),
      createColumnMeta("amount", "double", 1),
      createColumnMeta("region", "varchar", 2),
      createColumnMeta("status", "varchar", 3),
    ];
    expect(pickGroupByColumn(columns)).toBe("region");
  });

  it("skips non-groupable text columns for the no-cache fallback", () => {
    const columns = [
      createColumnMeta("id", "varchar", 0),
      createColumnMeta("uuid", "varchar", 1),
      createColumnMeta("UID", "varchar", 2),
      createColumnMeta("category", "varchar", 3),
    ];
    expect(pickGroupByColumn(columns)).toBe("category");
  });

  it("prefers a cached text column with fewer than 10 distinct values", () => {
    const columns = [
      createColumnMeta("region", "varchar", 0),
      createColumnMeta("category", "varchar", 1),
      createColumnMeta("notes", "varchar", 2),
    ];
    const summaries = new Map<string, ColumnSummary>([
      ["region", createTextColumnSummary("region", 50)],
      ["category", createTextColumnSummary("category", 4)],
      ["notes", createTextColumnSummary("notes", 200)],
    ]);
    expect(pickGroupByColumn(columns, summaries)).toBe("category");
  });

  it("picks the text column with the fewest known distinct values when none are enum-like", () => {
    const columns = [
      createColumnMeta("region", "varchar", 0),
      createColumnMeta("category", "varchar", 1),
    ];
    const summaries = new Map<string, ColumnSummary>([
      ["region", createTextColumnSummary("region", 50)],
      ["category", createTextColumnSummary("category", 12)],
    ]);
    expect(pickGroupByColumn(columns, summaries)).toBe("category");
  });

  it("returns undefined when there are no text columns", () => {
    expect(
      pickGroupByColumn([createColumnMeta("amount", "double", 0)]),
    ).toBeUndefined();
  });

  it("excludes already-used group-by columns when picking a second dimension", () => {
    const columns = [
      createColumnMeta("region", "varchar", 0),
      createColumnMeta("category", "varchar", 1),
      createColumnMeta("status", "varchar", 2),
    ];
    expect(
      pickGroupByColumn(columns, undefined, {
        excludeColumnNames: ["region"],
      }),
    ).toBe("category");
  });
});

describe("isNonAverageableColumnName", () => {
  const { isNonAverageableColumnName } = ChatSuggestionColumnPicker;
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
  const { pickAverageColumn } = ChatSuggestionColumnPicker;
  it("returns the first numeric column by column index", () => {
    const columns = [
      createColumnMeta("name", "varchar", 0),
      createColumnMeta("amount", "double", 1),
      createColumnMeta("count", "bigint", 2),
    ];
    expect(pickAverageColumn(columns)).toBe("amount");
  });

  it("returns undefined when there are no numeric columns", () => {
    expect(
      pickAverageColumn([createColumnMeta("name", "varchar", 0)]),
    ).toBeUndefined();
  });

  it("skips identifier columns even when stored as numeric types", () => {
    const columns = [
      createColumnMeta("ID", "bigint", 0),
      createColumnMeta("UUID", "double", 1),
      createColumnMeta("UID", "bigint", 2),
      createColumnMeta("amount", "double", 3),
    ];
    expect(pickAverageColumn(columns)).toBe("amount");
  });

  it("skips phone and SSN columns stored as numeric types", () => {
    const columns = [
      createColumnMeta("phone", "bigint", 0),
      createColumnMeta("ssn", "double", 1),
      createColumnMeta("zip", "bigint", 2),
      createColumnMeta("total_amount", "double", 3),
    ];
    expect(pickAverageColumn(columns)).toBe("total_amount");
  });

  it("returns undefined when every numeric column is non-averageable", () => {
    const columns = [
      createColumnMeta("id", "bigint", 0),
      createColumnMeta("phone_number", "double", 1),
      createColumnMeta("zip_code", "bigint", 2),
    ];
    expect(pickAverageColumn(columns)).toBeUndefined();
  });
});
