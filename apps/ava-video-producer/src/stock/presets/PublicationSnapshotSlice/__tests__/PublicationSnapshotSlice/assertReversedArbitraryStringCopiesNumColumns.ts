import { DEFAULT_INPUT } from "../../PublicationSnapshotSlice.fixtures";
import { inputSchema } from "../../PublicationSnapshotSlice.schema";
import { assertReversedArbitraryStringCopiesFrame as _assertReversedArbitraryStringCopiesFrame } from "./assertReversedArbitraryStringCopiesFrame";

/**
 * Asserts reversed arbitrary-string copies retain readable destination
 * column attribution from first copy through settling.
 */
export function assertReversedArbitraryStringCopiesNumColumns(
  numColumns: number,
): void {
  const columnIds = Array.from({ length: numColumns }, (_, index) => {
    return `column${index}`;
  });
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    table: {
      columns: columnIds.map((id, index) => {
        return { id, label: `${"W".repeat(16)}${index}X` };
      }),
      rows: ["first", "second"].map((id, rowIndex) => {
        return {
          id,
          cells: columnIds.map((_, columnIndex) => {
            return `v${rowIndex}${columnIndex}`;
          }),
        };
      }),
    },
    selection: {
      rowIds: ["second", "first"],
      columnIds: [...columnIds].reverse(),
    },
    liveEdit: { rowId: "first", columnId: columnIds[0], value: "changed" },
  });
  [
    83,
    ...Array.from({ length: 87 }, (_, index) => {
      return 56.5 + index / 2;
    }),
  ].forEach((frame) => {
    return _assertReversedArbitraryStringCopiesFrame({
      frame,
      input,
      numColumns,
    });
  });
}
