import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { type AssertReversedArbitraryStringCopiesLabelsOptions } from "./PublicationSnapshotSliceTestState.types";

/**
 * Asserts reversed arbitrary-string copies retain readable destination
 * column attribution from first copy through settling.
 */
export function assertReversedArbitraryStringCopiesLabels({
  labels,
  column,
  input,
  frame,
  paint,
  columnIndex,
  left,
  right,
}: Readonly<AssertReversedArbitraryStringCopiesLabelsOptions>): void {
  assert.equal(labels.map(prop("text")).join(""), column.label);
  input.table.rows
    .filter((row) => {
      return row.id === "first" || frame > 74;
    })
    .forEach((row) => {
      const value = paint.find((item) => {
        return (
          item.kind === "text" &&
          item.text === row.cells[columnIndex] &&
          item.left >= left &&
          item.right <= right
        );
      });
      assert.ok(
        value,
        `Expected visible arbitrary copy ${row.cells[columnIndex]}.`,
      );
      assert.ok(
        labels.every((label) => {
          return label.bottom < value.top;
        }),
        "The readable heading must precede its actual values in the same column.",
      );
    });
}
