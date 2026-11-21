import { PdfGridReconstructionTestState } from "./PdfGridReconstructionTestState";

const { render: _render } = PdfGridReconstructionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../PdfGridReconstruction.fixtures";

/**
 * Asserts dense repeated and empty cells retain their exact coordinates in
 * all evidence modes.
 */
export function assertDenseRepeatedEmptyCellsSignal(
  signal: "tagged-cells" | "ruling-lines" | "whitespace",
): void {
  const input = { ...fixtures[2].input, signal, showSourceLinks: false };
  const hold = _render({ frame: 150, input: input });
  input.grid.rows.forEach((row, rowIndex) => {
    return row.forEach((_, columnIndex) => {
      const rect = [...hold.matchAll(/<rect[^>]+>/g)]
        .map(([tag]) => {
          return tag;
        })
        .find((tag) => {
          return tag.includes(`data-result-cell="${rowIndex}:${columnIndex}"`);
        });
      assert.ok(rect);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }),
        508 + columnIndex * 100,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
        290 + rowIndex * 64,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "width" }),
        100,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "height" }),
        64,
      );
    });
  });
  assert.equal((hold.match(/data-raw-grid-value="same"/g) ?? []).length, 18);
  assert.equal((hold.match(/data-raw-grid-value=""/g) ?? []).length, 2);
}
