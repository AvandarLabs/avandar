import {
  estimateColumnCsvBytes,
  estimateRelationCsvBytes,
  estimateRowCsvBytes,
} from "$/connectors/postgres/estimateRelationCsvBytes.ts";
import { describe, expect, it } from "vitest";
import type { ColumnSizeInfo } from "$/connectors/postgres/estimateRelationCsvBytes.ts";

function _column(
  overrides: Partial<ColumnSizeInfo> & { columnName: string },
): ColumnSizeInfo {
  return {
    dataType: "integer",
    characterMaximumLength: null,
    ...overrides,
  };
}

describe("estimateColumnCsvBytes", () => {
  it("uses the declared length for a bounded varchar, never a guess", () => {
    const column = _column({
      columnName: "anything_at_all",
      dataType: "character varying",
      characterMaximumLength: 40,
    });
    expect(estimateColumnCsvBytes(column)).toBe(40);
  });

  it("returns a fixed width for a uuid regardless of column name", () => {
    const column = _column({ columnName: "misc", dataType: "uuid" });
    expect(estimateColumnCsvBytes(column)).toBe(36);
  });

  it("matches a free-text heuristic for an unbounded text column", () => {
    const column = _column({ columnName: "notes", dataType: "text" });
    expect(estimateColumnCsvBytes(column)).toBeGreaterThan(100);
  });

  it("matches a short-text heuristic for a title-like unbounded column", () => {
    const column = _column({ columnName: "post_title", dataType: "text" });
    const bytes = estimateColumnCsvBytes(column);
    expect(bytes).toBeGreaterThan(20);
    expect(bytes).toBeLessThan(100);
  });

  it("falls back to the default guess for an unrecognized unbounded text column", () => {
    const column = _column({
      columnName: "zzz_unrecognized_field",
      dataType: "character varying",
      characterMaximumLength: null,
    });
    expect(estimateColumnCsvBytes(column)).toBe(50);
  });

  it("uses a flat guess for jsonb, never the default text fallback", () => {
    const column = _column({ columnName: "payload", dataType: "jsonb" });
    expect(estimateColumnCsvBytes(column)).toBe(200);
  });

  it("falls back to the name heuristic for numeric with no declared precision", () => {
    const column = _column({ columnName: "notes", dataType: "numeric" });
    // Unbounded numeric is not in the fixed-width table on purpose - it
    // should fall through to the same heuristic unbounded text would.
    expect(estimateColumnCsvBytes(column)).toBeGreaterThan(100);
  });
});

describe("estimateRowCsvBytes", () => {
  it("sums every column plus commas and the \\r\\n terminator", () => {
    const columns: ColumnSizeInfo[] = [
      _column({ columnName: "id", dataType: "uuid" }), // 36
      _column({ columnName: "active", dataType: "boolean" }), // 5
    ];
    // 36 + 5 + 1 comma + 2-byte terminator.
    expect(estimateRowCsvBytes(columns)).toBe(36 + 5 + 1 + 2);
  });

  it("adds no comma for a single-column relation", () => {
    const columns: ColumnSizeInfo[] = [
      _column({ columnName: "id", dataType: "uuid" }),
    ];
    expect(estimateRowCsvBytes(columns)).toBe(36 + 2);
  });
});

describe("estimateRelationCsvBytes", () => {
  it("multiplies the per-row estimate by the exact row count", () => {
    const columns: ColumnSizeInfo[] = [
      _column({ columnName: "id", dataType: "uuid" }),
    ];
    const perRow = estimateRowCsvBytes(columns);
    expect(estimateRelationCsvBytes({ columns, rowCount: 1000 })).toBe(
      perRow * 1000,
    );
  });
});
