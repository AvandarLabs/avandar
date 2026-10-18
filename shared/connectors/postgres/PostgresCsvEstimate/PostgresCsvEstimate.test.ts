import { describe, expect, it } from "vitest";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { ColumnSizeInfo } from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";

const {
  estimateColumnCsvBytes,
  estimateRowCsvBytes,
  estimateRelationCsvBytes,
  postgresMaxRowsPerCall,
} = PostgresCsvEstimate;

function _column(
  overrides: Partial<ColumnSizeInfo> & { columnName: string },
): ColumnSizeInfo {
  return {
    dataType: "integer",
    characterMaximumLength: null,
    ...overrides,
  };
}

describe("PostgresCsvEstimate.estimateColumnCsvBytes", () => {
  it("never estimates a bounded varchar wider than its declared length", () => {
    const column = _column({
      columnName: "anything_at_all",
      dataType: "character varying",
      characterMaximumLength: 40,
    });
    expect(estimateColumnCsvBytes(column)).toBe(40);
  });

  it("treats a varchar's declared length as a ceiling, not its average width", () => {
    // `varchar(255)` is a framework default, so most values are far shorter.
    const emailColumn = _column({
      columnName: "email",
      dataType: "character varying",
      characterMaximumLength: 255,
    });
    const wideColumn = _column({
      columnName: "anything_at_all",
      dataType: "character varying",
      characterMaximumLength: 65535,
    });
    expect(estimateColumnCsvBytes(emailColumn)).toBe(24);
    expect(estimateColumnCsvBytes(wideColumn)).toBe(50);
  });

  it("uses the declared length for a fixed-width character column, which is always padded to it", () => {
    const column = _column({
      columnName: "description",
      dataType: "character",
      characterMaximumLength: 10,
    });
    expect(estimateColumnCsvBytes(column)).toBe(10);
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

describe("PostgresCsvEstimate.estimateRowCsvBytes", () => {
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

describe("PostgresCsvEstimate.estimateRelationCsvBytes", () => {
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

describe("PostgresCsvEstimate.postgresMaxRowsPerCall", () => {
  it("derives a row cap from the shared byte budget and the relation's row width", () => {
    // 150MB budget / 100 bytes-per-row = 1,572,864 rows.
    expect(
      postgresMaxRowsPerCall({ columnCount: 3, estimatedRowBytes: 100 }),
    ).toBe(Math.floor(POSTGRES_MAX_BYTES_PER_ACQUIRE / 100));
  });

  it("defers to the byte cap when no row-width estimate is available", () => {
    expect(postgresMaxRowsPerCall({ columnCount: 3 })).toBe("unbounded");
  });

  it("defers to the byte cap when the row-width estimate is zero or negative", () => {
    expect(
      postgresMaxRowsPerCall({ columnCount: 3, estimatedRowBytes: 0 }),
    ).toBe("unbounded");
  });
});
