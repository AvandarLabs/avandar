import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { assertReversedArbitraryStringCopiesLabels as _assertReversedArbitraryStringCopiesLabels } from "./assertReversedArbitraryStringCopiesLabels";
import { type AssertReversedArbitraryStringCopiesColumnIdOptions } from "./PublicationSnapshotSliceTestState.types";

/**
 * Asserts reversed arbitrary-string copies retain readable destination
 * column attribution from first copy through settling.
 */
export function assertReversedArbitraryStringCopiesColumnId({
  columnId,
  selectedColumn,
  input,
  numColumns,
  paint,
  frame,
}: Readonly<AssertReversedArbitraryStringCopiesColumnIdOptions>): void {
  const columnIndex = input.table.columns.findIndex(propEq("id", columnId)),
    column = input.table.columns[columnIndex];
  const left = 508 + (selectedColumn * 400) / numColumns,
    right = left + 400 / numColumns;
  const labels = paint.filter((item) => {
    return (
      item.kind === "text" &&
      item.ariaLabel === column.label &&
      item.left >= left &&
      item.right <= right
    );
  });
  assert.ok(
    labels.length > 0,
    `Missing visible column attribution for ${columnId} at reversed frame${frame}.`,
  );
  _assertReversedArbitraryStringCopiesLabels({
    labels,
    column,
    input,
    frame,
    paint,
    columnIndex,
    left,
    right,
  });
}
