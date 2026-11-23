import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertCompleteMovingColumnsRemainHeaderOptions } from "./PdfGridReconstructionTestState";

/**
 * Asserts complete moving columns remain distinct from all retained source
 * cells and headers.
 */
export function assertCompleteMovingColumnsRemainHeader({
  header,
  columnIndex,
  resultHeaders,
  resultCells,
}: Readonly<AssertCompleteMovingColumnsRemainHeaderOptions>): void {
  if (columnIndex > 0) {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: resultHeaders[columnIndex - 1],
        name: "x",
      }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: resultHeaders[columnIndex - 1],
          name: "width",
        }) <=
        SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }),
      "whole columns remain disjoint during their stagger",
    );
  }
  const cells = resultCells.filter((tag) => {
    return tag.includes(`:${columnIndex}"`);
  });
  cells.forEach((cell) => {
    return assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: cell, name: "x" }),
      SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }),
    );
  });
}
