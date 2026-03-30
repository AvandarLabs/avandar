import { describe, expect, it } from "vitest";
import { remapColumnsByBaseId } from "@/views/DataExplorerApp/QueryColumnMultiSelect/remapColumnsByBaseId";
import type {
  QueryColumn,
  QueryColumnId,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

/**
 * Builds a minimal `QueryColumn` fixture.
 *
 * @param queryId - Synthetic `QueryColumn.id` (UUID generated at call-site).
 * @param baseId - Stable `baseColumn.id` (database primary key).
 * @param name - Column display name.
 */
function _mockCol(
  queryId: string,
  baseId: string,
  name: string,
): QueryColumn {
  return {
    id: queryId as QueryColumnId,
    aggregation: undefined,
    baseColumn: {
      id: baseId as DatasetColumnId,
      name,
      dataType: "varchar",
    },
  } as QueryColumn;
}

describe("remapColumnsByBaseId", () => {
  describe("returns undefined (no change needed)", () => {
    it("returns undefined for an empty selection", () => {
      const available = [_mockCol("q1", "b1", "month")];
      expect(
        remapColumnsByBaseId({
          selectedColumns: [],
          availableColumns: available,
        }),
      ).toBeUndefined();
    });

    it("returns undefined when selected columns already match available", () => {
      const col = _mockCol("q1", "b1", "month");
      expect(
        remapColumnsByBaseId({
          selectedColumns: [col],
          availableColumns: [col],
        }),
      ).toBeUndefined();
    });

    it("returns undefined when multiple selected columns all match", () => {
      const col1 = _mockCol("q1", "b1", "month");
      const col2 = _mockCol("q2", "b2", "total_cases");
      expect(
        remapColumnsByBaseId({
          selectedColumns: [col1, col2],
          availableColumns: [col1, col2],
        }),
      ).toBeUndefined();
    });
  });

  describe("URL hydration — same baseColumn.id, different QueryColumn.id", () => {
    it("remaps a single column to the canonical available instance", () => {
      // Simulates URL hydration: the URL sync hook creates a QueryColumn
      // with a different synthetic UUID than the one in the MultiSelect's
      // internal lookup. Both refer to the same underlying DB column.
      const hydrated = _mockCol("hydrated-uuid", "base-db-id", "month");
      const canonical = _mockCol("canonical-uuid", "base-db-id", "month");

      const result = remapColumnsByBaseId({
        selectedColumns: [hydrated],
        availableColumns: [canonical],
      });

      expect(result).toHaveLength(1);
      expect(result![0]!.id).toBe("canonical-uuid");
      expect(result![0]!.baseColumn.id).toBe("base-db-id");
    });

    it("remaps multiple columns, preserving order", () => {
      const hydratedMonth = _mockCol("h-month", "b-month", "month");
      const hydratedCases = _mockCol("h-cases", "b-cases", "total_cases");
      const canonMonth = _mockCol("c-month", "b-month", "month");
      const canonCases = _mockCol("c-cases", "b-cases", "total_cases");

      const result = remapColumnsByBaseId({
        selectedColumns: [hydratedMonth, hydratedCases],
        availableColumns: [canonMonth, canonCases],
      });

      expect(result).toHaveLength(2);
      expect(result![0]!.id).toBe("c-month");
      expect(result![1]!.id).toBe("c-cases");
    });
  });

  describe("data source change — column no longer available", () => {
    it("drops a column that is not in the new available set", () => {
      const oldCol = _mockCol("q-old", "b-old", "old_metric");
      const newCol = _mockCol("q-new", "b-new", "new_metric");

      const result = remapColumnsByBaseId({
        selectedColumns: [oldCol],
        availableColumns: [newCol],
      });

      expect(result).toHaveLength(0);
    });

    it("drops stale columns but keeps valid ones", () => {
      const stale = _mockCol("q-stale", "b-stale", "removed_col");
      const valid = _mockCol("q-valid", "b-valid", "kept_col");
      const canonValid = _mockCol("c-valid", "b-valid", "kept_col");

      const result = remapColumnsByBaseId({
        selectedColumns: [stale, valid],
        availableColumns: [canonValid],
      });

      expect(result).toHaveLength(1);
      expect(result![0]!.id).toBe("c-valid");
    });

    it("returns an empty array (not undefined) when all columns are dropped", () => {
      const stale = _mockCol("q-stale", "b-stale", "gone");

      const result = remapColumnsByBaseId({
        selectedColumns: [stale],
        availableColumns: [],
      });

      // Must be [] not undefined — caller must clear the selection.
      expect(result).toEqual([]);
    });
  });

  describe("empty available set", () => {
    it("returns empty array when available is empty and selection is non-empty", () => {
      const col = _mockCol("q1", "b1", "month");

      const result = remapColumnsByBaseId({
        selectedColumns: [col],
        availableColumns: [],
      });

      expect(result).toEqual([]);
    });

    it("returns undefined when both selection and available are empty", () => {
      expect(
        remapColumnsByBaseId({
          selectedColumns: [],
          availableColumns: [],
        }),
      ).toBeUndefined();
    });
  });
});
